"""
Scanne static/images/ et détecte le VRAI format de chaque fichier
en lisant sa signature binaire (peu importe son extension actuelle).

Utilisation :
    python detect_image_types.py
"""

import os

DOSSIER = "static/images"

# Signatures binaires connues (les premiers octets de chaque format)
def detect_real_type(chemin):
    with open(chemin, "rb") as f:
        head = f.read(16)

    if head[:3] == b'\xff\xd8\xff':
        return "jpeg"
    if head[:8] == b'\x89PNG\r\n\x1a\n':
        return "png"
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return "webp"
    if head[4:12] == b'ftypavif':
        return "avif"
    if head[4:8] == b'ftyp' and b'heic' in head:
        return "heic"
    if head[:6] in (b'GIF87a', b'GIF89a'):
        return "gif"
    if head[:2] == b'BM':
        return "bmp"
    return "inconnu"

EXTENSION_ATTENDUE = {
    "jpeg": [".jpg", ".jpeg"],
    "png": [".png"],
    "webp": [".webp"],
    "avif": [".avif"],
    "heic": [".heic"],
    "gif": [".gif"],
    "bmp": [".bmp"],
}

if not os.path.isdir(DOSSIER):
    print(f"❌ Dossier introuvable : {DOSSIER} (lance le script depuis la racine du projet)")
else:
    print(f"Scan de {DOSSIER}...\n")
    for nom in sorted(os.listdir(DOSSIER)):
        chemin = os.path.join(DOSSIER, nom)
        if not os.path.isfile(chemin):
            continue

        vrai_type = detect_real_type(chemin)
        extension_actuelle = os.path.splitext(nom)[1].lower()
        taille_ko = os.path.getsize(chemin) / 1024

        extensions_ok = EXTENSION_ATTENDUE.get(vrai_type, [])
        est_mal_nomme = extension_actuelle not in extensions_ok

        marqueur = "⚠️  MAL NOMMÉ" if est_mal_nomme else "✅ OK"
        print(f"{marqueur} | {nom:<30} | {taille_ko:>8.1f} Ko | type réel détecté : {vrai_type}")

    print("\nPour chaque ligne marquée ⚠️, colle-moi le résultat complet, "
          "je te dirai comment renommer le fichier et corriger les références dans le code.")