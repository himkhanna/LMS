package com.lms.course.quiz;

import com.lms.course.domain.Course;
import com.lms.course.repository.CourseRepository;
import com.lms.course.service.CourseNotFoundException;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Imports a Word (.docx) quiz document and creates a Quiz with its
 * questions in the database. The doc is expected to follow the
 * "Question N | Topic: ... | (Select all that apply)?" pattern with
 * options on lines starting with "A.", "B.", ..., a "Correct answer:"
 * line, and an optional "Why:" explanation. Header lines like
 * "Pass mark", "Time limit (suggested)", and "Total questions" are
 * parsed to seed the Quiz settings.
 */
@Service
@Transactional
public class QuizDocxImporter {

    private static final Logger log = LoggerFactory.getLogger(QuizDocxImporter.class);

    private static final Pattern QUESTION_HEADER = Pattern.compile(
            "^Question\\s+(\\d+)\\s*\\|\\s*Topic:\\s*([^|]+?)(?:\\s*\\|\\s*(.+))?$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern OPTION = Pattern.compile(
            "^([A-D])\\.\\s+(.*)$");
    private static final Pattern CORRECT = Pattern.compile(
            "^Correct\\s+answer:\\s*(.+)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern WHY = Pattern.compile(
            "^Why:\\s*(.+)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern PASS_MARK = Pattern.compile(
            "(\\d{1,3})\\s*%");
    private static final Pattern MINUTES = Pattern.compile(
            "(\\d+)\\s*minutes?", Pattern.CASE_INSENSITIVE);

    private final CourseRepository courses;
    private final QuizRepository quizzes;

    public QuizDocxImporter(CourseRepository courses, QuizRepository quizzes) {
        this.courses = courses;
        this.quizzes = quizzes;
    }

    public record ImportResult(Quiz quiz, int questionCount, List<String> warnings) {}

    public ImportResult importDocx(UUID courseId, String overrideTitle, MultipartFile file) {
        Course course = courses.findById(courseId)
                .orElseThrow(() -> new CourseNotFoundException("Course", courseId));
        List<String> lines = extractLines(file);
        if (lines.isEmpty()) {
            throw new IllegalArgumentException("The .docx contains no text");
        }
        ParsedQuiz parsed = parse(lines);

        Quiz q = new Quiz();
        q.setCourse(course);
        q.setTitle(overrideTitle != null && !overrideTitle.isBlank()
                ? overrideTitle.trim()
                : (parsed.title != null ? parsed.title : "Assessment Quiz"));
        q.setDescription(parsed.description);
        if (parsed.passScore != null) q.setPassScore(parsed.passScore);
        if (parsed.timeLimitMins != null) q.setTimeLimitMins(parsed.timeLimitMins);
        if (parsed.cooldownMins != null) q.setCooldownAfterFailMins(parsed.cooldownMins);
        q.setShuffleQuestions(parsed.shuffleQuestions);
        q.setShuffleOptions(parsed.shuffleOptions);
        q.setStatus(QuizStatus.DRAFT);
        q.setPosition(quizzes.findByCourseIdOrderByPositionAsc(courseId).size());

        int position = 0;
        for (ParsedQuestion pq : parsed.questions) {
            Question question = new Question();
            question.setPrompt(pq.stem);
            question.setOptions(new ArrayList<>(pq.options));
            question.setCorrect(new ArrayList<>(pq.correctIndexes));
            question.setType(pq.correctIndexes.size() > 1
                    ? QuestionType.MCQ_MULTI
                    : QuestionType.MCQ_SINGLE);
            question.setExplanation(pq.explanation);
            question.setTopic(pq.topic);
            question.setPoints(1);
            question.setPosition(position++);
            q.addQuestion(question);
        }
        Quiz saved = quizzes.save(q);
        log.info("Imported quiz {} with {} questions from {}", saved.getId(),
                parsed.questions.size(), file.getOriginalFilename());
        return new ImportResult(saved, parsed.questions.size(), parsed.warnings);
    }

    // ---- DOCX extraction ----

    private static List<String> extractLines(MultipartFile file) {
        try (InputStream in = file.getInputStream();
             XWPFDocument doc = new XWPFDocument(in)) {
            List<String> out = new ArrayList<>();
            // Walk the body in document order so paragraphs and tables
            // (used for the header settings block) interleave correctly.
            // Each cell becomes one line so lookahead-style parsing works
            // for rows like "Pass mark" | "80%".
            for (IBodyElement el : doc.getBodyElements()) {
                if (el instanceof XWPFParagraph p) {
                    addNormalised(out, p.getText());
                } else if (el instanceof XWPFTable t) {
                    for (XWPFTableRow row : t.getRows()) {
                        for (XWPFTableCell cell : row.getTableCells()) {
                            addNormalised(out, cell.getText());
                        }
                    }
                }
            }
            return out;
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read .docx: " + e.getMessage(), e);
        }
    }

    /** Strip Word's smart-replaced punctuation that trips the regexes. */
    private static void addNormalised(List<String> out, String text) {
        if (text == null) return;
        String s = text
                .replace('\u00a0', ' ')
                .replace('\u2013', '-')
                .replace('\u2014', '-')
                .replace('\u2018', '\'')
                .replace('\u2019', '\'')
                .replace('\u201c', '"')
                .replace('\u201d', '"')
                .trim();
        if (!s.isEmpty()) out.add(s);
    }

    // ---- Parsing ----

    private static class ParsedQuiz {
        String title;
        String description;
        Integer passScore;
        Integer timeLimitMins;
        Integer cooldownMins;
        boolean shuffleQuestions = false;
        boolean shuffleOptions = false;
        List<ParsedQuestion> questions = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
    }

    private static class ParsedQuestion {
        Integer number;
        String topic;
        boolean multi;
        String stem;
        List<String> options = new ArrayList<>();
        List<Integer> correctIndexes = new ArrayList<>();
        String explanation;
    }

    private ParsedQuiz parse(List<String> lines) {
        ParsedQuiz pq = new ParsedQuiz();
        // The first non-trivial line is usually the title; the second
        // ("Assessment Quiz") clarifies the type.
        if (!lines.isEmpty()) pq.title = lines.get(0);
        if (lines.size() > 1 && lines.get(1).toLowerCase().contains("quiz")) {
            pq.title = lines.get(0) + " — " + lines.get(1);
        }

        ParsedQuestion current = null;
        StringBuilder stemBuf = null;
        boolean inExplanation = false;
        boolean recommendShuffle = false;

        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            String lower = line.toLowerCase();

            // Header settings (only before the first Question marker)
            if (current == null) {
                if (lower.startsWith("pass mark")) {
                    String next = lookahead(lines, i);
                    if (next != null) {
                        Matcher pm = PASS_MARK.matcher(next);
                        if (pm.find()) pq.passScore = Integer.parseInt(pm.group(1));
                    }
                    continue;
                }
                if (lower.startsWith("time limit")) {
                    String next = lookahead(lines, i);
                    if (next != null) {
                        Matcher m = MINUTES.matcher(next);
                        if (m.find()) pq.timeLimitMins = Integer.parseInt(m.group(1));
                    }
                    continue;
                }
                if (lower.startsWith("retakes")) {
                    String next = lookahead(lines, i);
                    if (next != null) {
                        Matcher m = Pattern.compile("(\\d+)[- ]?hour", Pattern.CASE_INSENSITIVE)
                                .matcher(next);
                        if (m.find()) pq.cooldownMins = Integer.parseInt(m.group(1)) * 60;
                    }
                    continue;
                }
                if (lower.startsWith("question pool") || lower.startsWith("shuffle")) {
                    recommendShuffle = true;
                    continue;
                }
                if (recommendShuffle) {
                    // Line after the "Question pool / shuffle" label
                    if (lower.contains("shuffle")) {
                        pq.shuffleQuestions = lower.contains("question");
                        pq.shuffleOptions = lower.contains("option");
                    }
                    recommendShuffle = false;
                }
            }

            Matcher qh = QUESTION_HEADER.matcher(line);
            if (qh.matches()) {
                // Close out previous question
                if (current != null) {
                    finishStem(current, stemBuf);
                    pq.questions.add(current);
                }
                current = new ParsedQuestion();
                current.number = Integer.parseInt(qh.group(1));
                current.topic = qh.group(2).trim();
                String trailing = qh.group(3);
                if (trailing != null && trailing.toLowerCase().contains("select all")) {
                    current.multi = true;
                }
                stemBuf = new StringBuilder();
                inExplanation = false;
                continue;
            }

            if (current == null) continue; // still in header

            Matcher opt = OPTION.matcher(line);
            if (opt.matches()) {
                finishStem(current, stemBuf);
                stemBuf = null;
                current.options.add(opt.group(2).trim());
                continue;
            }

            Matcher correct = CORRECT.matcher(line);
            if (correct.matches()) {
                String letters = correct.group(1);
                for (String token : letters.split("[,\\s]+")) {
                    if (token.length() == 1) {
                        char c = Character.toUpperCase(token.charAt(0));
                        if (c >= 'A' && c <= 'Z') {
                            int idx = c - 'A';
                            if (idx < current.options.size() && !current.correctIndexes.contains(idx)) {
                                current.correctIndexes.add(idx);
                            }
                        }
                    }
                }
                if (current.correctIndexes.size() > 1) current.multi = true;
                inExplanation = false;
                continue;
            }

            Matcher why = WHY.matcher(line);
            if (why.matches()) {
                current.explanation = why.group(1).trim();
                inExplanation = true;
                continue;
            }

            // Continuation: either explanation overflow or stem prose
            if (inExplanation && current.explanation != null) {
                current.explanation = current.explanation + " " + line;
            } else if (stemBuf != null) {
                if (stemBuf.length() > 0) stemBuf.append(' ');
                stemBuf.append(line);
            }
        }
        if (current != null) {
            finishStem(current, stemBuf);
            pq.questions.add(current);
        }

        // Validate
        List<ParsedQuestion> good = new ArrayList<>();
        for (ParsedQuestion q : pq.questions) {
            if (q.stem == null || q.stem.isBlank()) {
                pq.warnings.add("Q" + q.number + ": skipped — no stem found");
                continue;
            }
            if (q.options.size() < 2) {
                pq.warnings.add("Q" + q.number + ": skipped — fewer than 2 options");
                continue;
            }
            if (q.correctIndexes.isEmpty()) {
                pq.warnings.add("Q" + q.number + ": skipped — no correct answer found");
                continue;
            }
            good.add(q);
        }
        pq.questions = good;
        if (pq.questions.isEmpty()) {
            throw new IllegalArgumentException(
                    "No valid questions could be parsed. Check the doc follows the "
                            + "'Question N | Topic: ...' + A./B./C./D. + Correct answer: + Why: structure.");
        }
        return pq;
    }

    private static void finishStem(ParsedQuestion q, StringBuilder buf) {
        if (q.stem != null) return;
        if (buf != null && buf.length() > 0) q.stem = buf.toString().trim();
    }

    private static String lookahead(List<String> lines, int i) {
        return (i + 1 < lines.size()) ? lines.get(i + 1) : null;
    }
}
