package com.lms.course.ai;

import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Renders each slide of a .pptx deck to a PNG byte array using Apache POI.
 * Quality depends on the fonts available in the JVM — if a deck uses a
 * font that isn't installed in the container, POI falls back to a default
 * font and text positioning may shift slightly. Acceptable for typical
 * corporate decks; for higher fidelity we'd swap to a LibreOffice
 * headless render.
 *
 * .ppt (binary, HSLF) is NOT supported here — the legacy format uses a
 * different rendering pipeline. Callers should reject .ppt before
 * invoking this class.
 */
public final class SlideDeckRenderer {

    /** Target pixel width for rendered slides. PowerPoint default is 13.33in × 96dpi ≈ 1280px. */
    private static final int TARGET_WIDTH_PX = 1280;

    private SlideDeckRenderer() {}

    public record RenderedSlide(int index, int width, int height, byte[] png) {}

    public static List<RenderedSlide> renderToPng(InputStream in) throws IOException {
        try (XMLSlideShow ppt = new XMLSlideShow(in)) {
            Dimension pgsize = ppt.getPageSize();
            double scale = Math.min(2.0, TARGET_WIDTH_PX / (double) pgsize.width);
            int width = (int) Math.round(pgsize.width * scale);
            int height = (int) Math.round(pgsize.height * scale);

            List<RenderedSlide> out = new ArrayList<>();
            int idx = 0;
            for (XSLFSlide slide : ppt.getSlides()) {
                BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
                Graphics2D g = img.createGraphics();
                try {
                    g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                    g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
                    g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
                    g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                    g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
                    g.setColor(Color.WHITE);
                    g.fillRect(0, 0, width, height);
                    g.scale(scale, scale);
                    slide.draw(g);
                } finally {
                    g.dispose();
                }
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(img, "PNG", baos);
                out.add(new RenderedSlide(idx++, width, height, baos.toByteArray()));
            }
            return out;
        }
    }
}
