FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package && cp target/*.jar /app/app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
# Apache POI needs fonts to render slide text decently. Without these, the
# Slideshow upload mode produces images with default sans-serif text and
# missing glyphs for any Microsoft-style font referenced in the deck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fontconfig \
        fonts-dejavu \
        fonts-liberation \
        fonts-noto-core \
        fonts-noto-cjk \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/app.jar /app/app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-Djava.awt.headless=true", "-jar", "/app/app.jar"]
