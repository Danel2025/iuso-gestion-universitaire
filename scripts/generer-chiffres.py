"""
Génère les polices « chiffres seuls » de la plateforme à partir de Barlow.

Les chiffres 0-9 de toute l'interface sont dessinés en Barlow (police de type
DIN), le reste du texte en Libre Franklin (voir src/styles.css). Plutôt que de
faire télécharger Barlow en entier pour dix glyphes, on n'en garde que les
chiffres, avec leurs variantes proportionnelles et tabulaires (pnum/tnum) :
environ 2 Ko par graisse (CDC §8).

Prérequis : pip install fonttools brotli
Usage    : python scripts/generer-chiffres.py   (depuis la racine du projet,
           après pnpm install, @fontsource/barlow étant une devDependency)

Affiche aussi le size-adjust à reporter dans styles.css pour que la hauteur
des chiffres Barlow égale celle des chiffres de Libre Franklin.
"""

import shutil
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

RACINE = Path(__file__).resolve().parent.parent
SOURCE = RACINE / "node_modules/@fontsource/barlow"
TEXTE = RACINE / "node_modules/@fontsource-variable/libre-franklin/files/libre-franklin-latin-wght-normal.woff2"
SORTIE = RACINE / "src/assets/polices"
GRAISSES = (400, 500, 600, 700)
CHIFFRES = "0123456789"


def hauteur_chiffres(police: TTFont) -> int:
    """Hauteur de la barre du « 1 », sans dépassement optique des chiffres ronds."""
    nom = police.getBestCmap()[ord("1")]
    jeu = police.getGlyphSet()
    from fontTools.pens.boundsPen import BoundsPen

    stylo = BoundsPen(jeu)
    jeu[nom].draw(stylo)
    return stylo.bounds[3]


def main() -> None:
    SORTIE.mkdir(parents=True, exist_ok=True)
    options = Options()
    options.flavor = "woff2"
    options.layout_features = ["tnum", "pnum"]
    options.name_IDs = ["*"]
    options.notdef_outline = True

    for graisse in GRAISSES:
        police = TTFont(SOURCE / f"files/barlow-latin-{graisse}-normal.woff2")
        decoupe = Subsetter(options)
        decoupe.populate(text=CHIFFRES)
        decoupe.subset(police)
        cible = SORTIE / f"chiffres-barlow-{graisse}.woff2"
        police.flavor = "woff2"
        police.save(cible)
        print(f"{cible.relative_to(RACINE)} : {cible.stat().st_size} octets")

    shutil.copyfile(SOURCE / "LICENSE", SORTIE / "OFL-Barlow.txt")

    barlow = TTFont(SOURCE / "files/barlow-latin-400-normal.woff2")
    franklin = TTFont(TEXTE)
    ratio = hauteur_chiffres(franklin) / franklin["head"].unitsPerEm
    ratio /= hauteur_chiffres(barlow) / barlow["head"].unitsPerEm
    print(f"size-adjust à reporter dans styles.css : {ratio * 100:.1f}%")


if __name__ == "__main__":
    main()
