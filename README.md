# TSBB11 - CDIO

## Project members

- Sabina Pegler ()
- Axel Söderlind ()
- Philip Welin-Berger ()
- Rebecca Lejdå ()
- Malte Hegg ()

## Project backlog

### Detektering av kroppspositioner

Uppfyllningsvillkor: Via system kunna detektera en statisk mängd av _n_ olika positioner (t.ex T-pose, armar upp, armar ned, en arm uppe osv.) och konvertera detta till en diskret signal. Antingen i real-time eller från förinspelade videoklipp.

- Kunna skapa ett 3D point-cloud utifrån en mänsklig pose
- Kunna mappa ett visst pose point-cloud till en viss pose

### API mellan systemen

Uppfyllningsvillkor: Via en API kunna kommunicera mellan kamerasystemet och grafiksystemet på ett sätt så att det förstnämnda systemet kan direkt påverka det sistnämnda systemet.

- Kunna skicka information från pose-detektionssystemet till grafiksystemet

### Grafisk representation

Uppfyllningsvillkor: Via ett system kunna generera olika 3D miljöer (t.ex. vatten, moln, öken, partikeleffekter, fog, abstrakta fenomen) och utifrån signalen från detektionssystemet kunna göra avsevärda förändringar i miljön (t.ex. byta scen, ändra egenskaper i miljön, misc. visuella effekter)

Requirement: By way of a system be able to generate different 3D environments, and based on the signal from the signal from the backend make certain changes to the parameters of the environment

**Will do (Grafik)**
- Procedurally generated grass
- Ambient occlussion
- LOD (level of detail) 
- Water from noise functions
- Clouds from noise functions
- Procedurally generated mountains
- Skybox with fractals
- Transition-animation between different scene
- At least 3 different scene (grassy fields, ocean level, mountain desert, LSD, etc..)
- Bird flocks
- Particle effects

**Will do (API)**
- Implement a system that listens to signals from system 1
- Implement a transition between scenes
- Implement an interpolation with parameters for noise m.m

**Would be pretty nice**
- Generative trees
- Day-night cycle
- More scenes