import type { FaqDoc } from "./en";

export const faqFr: FaqDoc = {
  title: "Questions fréquentes",
  intro: "Comment Ofolam traite tes données, et comment publier ce que tu crées.",
  back: "Retour à l'app",
  sections: [
    {
      heading: "Tes données",
      items: [
        {
          q: "Qu'est-ce qu'Ofolam conserve sur moi ?",
          a: [
            "Ton identifiant d'athlète Strava, ton prénom et ton pays, ainsi que les jetons que Strava nous remet pour lire tes activités, chiffrés. Les modèles que tu enregistres sont conservés aussi.",
            "Il n'y a ni mesure d'audience, ni publicité, ni pistage.",
          ],
        },
        {
          q: "Combien de temps mes données sont-elles conservées ?",
          a: [
            "Tant que tu as une session active. Te déconnecter de ta dernière session supprime immédiatement ta fiche, tes jetons et tes modèles.",
            "Une session inutilisée pendant 90 jours est supprimée automatiquement, et ta fiche avec elle dès qu'il ne reste plus aucune session. Si tu révoques l'accès d'Ofolam sur Strava, ta fiche est supprimée dès que l'app le constate.",
          ],
        },
        {
          q: "Mes activités sont-elles stockées ?",
          a: [
            "Elles sont lues sur Strava quand tu utilises l'app, puis gardées en cache pour respecter les limites de Strava : 5 minutes pour la liste, jusqu'à 24 heures pour une activité. Ton appareil en garde aussi une copie pour que l'app s'ouvre instantanément.",
            "« Actualiser depuis Strava », dans le menu, contourne les deux caches.",
          ],
        },
        {
          q: "Mes photos et mes vidéos sont-elles envoyées quelque part ?",
          a: [
            "Non. Le visuel est dessiné dans ton navigateur : les photos et les vidéos ne quittent jamais ton appareil.",
            "Seul le fond Carte appelle un service extérieur (Stadia Maps), qui reçoit la zone de ton tracé et ton adresse IP, comme toute carte en ligne.",
          ],
        },
        {
          q: "Comment tout supprimer ?",
          a: [
            "Déconnecte-toi. S'il s'agit de ta dernière session, tout est supprimé d'un coup. Tu peux aussi révoquer l'accès depuis tes réglages Strava (Mes applications), ou écrire à {email}.",
          ],
        },
      ],
    },
    {
      heading: "Publier",
      items: [
        {
          q: "Comment publier dans ma story Instagram ?",
          a: [
            "Choisis le format Story 9:16, touche Partager puis Instagram. Sur ordinateur, télécharge l'image et envoie-la sur ton téléphone.",
            "Active la zone visible Instagram pour que tes textes ne passent pas sous l'interface d'Instagram.",
          ],
        },
        {
          q: "À quoi sert le fond Sticker ?",
          a: [
            "Il exporte la carte avec un fond transparent. Copie-la, puis colle-la sur une photo ou une vidéo dans l'éditeur de story d'Instagram. Tu gardes les outils d'Instagram pour la photo en dessous.",
          ],
        },
        {
          q: "Comment créer un carrousel ?",
          a: [
            "Choisis le fond Image, puis ajoute des images, jusqu'à 10 : des photos, une carte, ou une couleur unie claire ou sombre. Les mêmes textes et le même tracé sont repris sur chacune. Fais glisser les vignettes pour changer leur ordre.",
            "Avec les flèches sous l'aperçu, passe d'une image à l'autre pour vérifier que les textes restent lisibles sur chacune. Chaque image garde ses propres réglages (cadrage pour une photo, style pour une carte, couleur pour un fond uni) ; les textes et le tracé gardent la même place sur toutes, donc déplacer un élément le déplace partout.",
            "Partager envoie ensuite toutes les images d'un coup, et Instagram les propose comme une seule publication. « Télécharger les images », dans le menu, les enregistre toutes, numérotées dans l'ordre.",
          ],
        },
        {
          q: "Quel format pour quel usage ?",
          a: [
            "Story 9:16 pour les stories et les reels. Post 4:5 pour le fil Instagram et les carrousels. Carré 1:1 passe partout. Paysage 16:9 pour X, Facebook ou un blog.",
          ],
        },
        {
          q: "Puis-je publier une vidéo ?",
          a: [
            "Oui. Choisis le fond Vidéo, sélectionne un extrait de 60 secondes au maximum, puis touche Créer la vidéo. La vidéo est encodée sur ton appareil ; tu peux ensuite la partager ou la télécharger.",
          ],
        },
        {
          q: "Puis-je masquer l'endroit où j'habite ?",
          a: [
            "Oui. Sélectionne le tracé, puis utilise « Masquer le départ et l'arrivée » : la distance choisie est retirée aux deux extrémités du tracé.",
          ],
        },
      ],
    },
    {
      heading: "L'application",
      items: [
        {
          q: "Comment installer Ofolam sur mon téléphone ?",
          a: [
            "Ofolam s'installe depuis le navigateur, sans passer par un store : utilise « Installer l'app » dans le menu. Sur iPhone, ouvre le site dans Safari, touche Partager, puis « Sur l'écran d'accueil ».",
          ],
        },
        {
          q: "Une nouvelle activité n'apparaît pas. Que faire ?",
          a: [
            "La liste est gardée en cache 5 minutes. « Actualiser depuis Strava », dans le menu, la recharge tout de suite.",
          ],
        },
        {
          q: "Que sont les modèles ?",
          a: [
            "Un modèle est une mise en page : quels éléments sont affichés, où, et dans quel style. Il ne change jamais ton fond ni ton format.",
            "Tu peux enregistrer jusqu'à 20 modèles personnels avec « Enregistrer la mise en page actuelle comme modèle ».",
          ],
        },
        {
          q: "Ofolam est-il gratuit ?",
          coffee: "Si l'app te plaît, tu peux soutenir le projet :",
          a: ["Oui, gratuit et sans publicité. C'est un projet indépendant, sans lien avec Strava."],
        },
      ],
    },
  ],
};
