# Boutique e-commerce Firebase — version sans Storage

Cette version utilise Firebase Authentication et Firestore, mais pas Firebase Storage. Aucun forfait Blaze n’est nécessaire pour les images.

## Configuration

1. Copiez votre configuration Firebase dans `assets/firebase-config.js`.
2. Activez Authentication avec Email/Password.
3. Créez Firestore et publiez le contenu de `firestore.rules`.
4. Lancez `index.html` avec Live Server.
5. Ouvrez `admin.html` pour ajouter les produits.

## Photos

Dans le champ « Lien de la photo », utilisez soit :

- un lien public direct : `https://site.com/photo.jpg`
- un fichier local placé dans `assets/images`, par exemple : `assets/images/chemise.jpg`

Pour un fichier local, copiez manuellement la photo dans `assets/images` avant d’enregistrer le produit.

## Remplacement de l’ancienne version

Vous pouvez remplacer seulement ces fichiers :

- `admin.html`
- `assets/admin.js`
- `assets/style.css`

Conservez votre propre `assets/firebase-config.js` si vous l’avez déjà configuré.
