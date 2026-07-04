"""
À lancer SUR TON PC, depuis la racine du projet (là où se trouve static/).

Installation (une seule fois) :
    pip install Pillow

Utilisation :
    python compress_hero_images.py
"""

from PIL import Image
import os

# (nom_fichier, largeur_max_en_pixels, qualite_jpeg)
# NOTE : 1.jpg n'est PAS dans cette liste : c'est en realite un fichier AVIF
# (renomme par erreur en .jpg), deja bien compresse (174 Ko). Il faut juste le
# renommer en 1.avif a la main (voir instructions donnees dans le chat).
IMAGES_A_TRAITER = [
    ("mobile_hero.jpg", 900, 75),      # hero mobile #1
    ("hero-mobile2.png", 900, 75),     # hero mobile #2 -> 3 Mo, sera converti en .jpg
    ("5.jpg", 1920, 75),               # header desktop de couran.html -> 1.8 Mo
    ("header-adkar-mobile.jpg", 900, 75),   # 528 Ko, un peu lourd
    ("header-couran-mobile.jpg", 900, 75),  # 308 Ko
]

DOSSIER = "static/images"

for nom_fichier, largeur_max, qualite in IMAGES_A_TRAITER:
    chemin = os.path.join(DOSSIER, nom_fichier)
    if not os.path.exists(chemin):
        print(f"AVERTISSEMENT: Introuvable : {chemin} - passe au suivant")
        continue

    taille_avant = os.path.getsize(chemin) / 1024  # Ko

    try:
        img = Image.open(chemin).convert("RGB")
    except Exception as e:
        print(f"ERREUR: Impossible de lire {nom_fichier} ({e}) - passe au suivant")
        continue

    if img.width > largeur_max:
        ratio = largeur_max / img.width
        nouvelle_hauteur = int(img.height * ratio)
        img = img.resize((largeur_max, nouvelle_hauteur), Image.LANCZOS)

    nom_sortie = os.path.splitext(nom_fichier)[0] + ".jpg"
    chemin_sortie = os.path.join(DOSSIER, nom_sortie)

    try:
        img.save(chemin_sortie, "JPEG", quality=qualite, optimize=True, progressive=True)
    except Exception as e:
        print(f"ERREUR: Impossible d'enregistrer {nom_sortie} ({e})")
        continue

    taille_apres = os.path.getsize(chemin_sortie) / 1024  # Ko
    print(f"OK: {nom_fichier} : {taille_avant:.0f} Ko -> {nom_sortie} : {taille_apres:.0f} Ko")

print("\nTermine.")
print("hero-mobile2.png devient hero-mobile2.jpg, deja pris en compte dans base.html.")