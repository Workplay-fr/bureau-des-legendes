# Vidéo « Côté exploitant » (Bureau des Légendes × Nexudus)

Balade de 2 min 11 dans Nexudus, montée à partir de captures d'écran, en Python (Pillow) + ffmpeg. Reprise du montage StockBox (dépôt Workplay-fr/stockbox, outils/video).

- `montage.py` : la trame (scènes, effets zoom / travelling / projecteur / clic / écran partagé, fondus et glissements, intro et fin avec défilé).
- `charte.py` : l'habillage à la charte du site (Jost, noir #19110B, crème #F6F1EB, bleu lustre #3C6A9E ; entrée de l'immeuble et verrière de nuit en fond, logo en haut à gauche).

Chemins attendus : captures 1512×810 dans `/home/claude/video-bdl/caps/`, police `Jost.ttf` (google/fonts, ofl/jost) dans `/home/claude/video-bdl/fonts/`, images du site dans `img/`.

Rendu : `python3 charte.py sortie.mp4` (30 i/s, 1920×1080). Musique : symphonie Pixabay (131,16 s), fondus 1 s / 3,5 s, `loudnorm` à -19 LUFS. Version web `-crf 26` (15,5 Mo) dans `video/bdl-exploitant.mp4`, miniature `video/bdl-exploitant.jpg`. Notification du site : `agent/video.js`.
