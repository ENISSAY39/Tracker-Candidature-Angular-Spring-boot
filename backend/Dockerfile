# syntax=docker/dockerfile:1

# Build : JDK 25 + Maven wrapper
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace

# Dépendances d'abord : la couche reste en cache tant que pom.xml ne change pas
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src src
# Les tests tournent en CI (Testcontainers), pas dans l'image
RUN ./mvnw -B -q package -DskipTests

# Exécution : JRE 25 seul, utilisateur non root
FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd --system --no-create-home tracker
COPY --from=build /workspace/target/tracker-*.jar app.jar
USER tracker
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
