import type { LegalContent } from "./en";

export const legalFr: LegalContent = {
  links: { privacy: "Confidentialité", terms: "Conditions d'utilisation", legal: "Mentions légales" },
  back: "Retour à l'app",

  privacy: {
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 30 septembre 2026",
    sections: [
      {
        heading: "Qui sommes-nous",
        paragraphs: [
          "Ofolam est une application web gratuite éditée par {name}. Elle transforme une activité Strava en image partageable. Pour toute question sur vos données : {email}.",
        ],
      },
      {
        heading: "Ce que nous collectons",
        paragraphs: [
          "Lorsque vous vous connectez avec Strava, nous recevons et stockons votre identifiant d'athlète Strava, votre prénom et votre pays, ainsi que les jetons d'accès que Strava nous délivre. Ces jetons sont chiffrés avant stockage et servent uniquement à lire vos activités pour votre compte.",
          "Vos activités (nom, sport, date, distance, durée, dénivelé, vitesse moyenne et tracé GPS) sont récupérées auprès de Strava quand vous utilisez l'app. Elles sont mises en cache au plus 24 heures de notre côté, pour respecter les quotas de Strava, et sur votre appareil pour que l'app s'ouvre vite.",
          "Les photos que vous ajoutez à une image ne quittent jamais votre appareil : l'image est dessinée dans votre navigateur. Le fond de carte, quand il est activé, est chargé depuis un serveur de tuiles tiers (Stadia Maps par défaut), qui reçoit alors la zone de votre parcours et votre adresse IP, comme toute carte en ligne.",
          "Nous n'utilisons ni mesure d'audience, ni publicité, ni traceur. Un cookie mémorise votre choix de langue ; le stockage local de votre navigateur conserve votre session, votre thème et un cache de vos activités.",
        ],
      },
      {
        heading: "Pourquoi et sur quelle base",
        paragraphs: [
          "Ces données servent uniquement à fournir le service que vous demandez : la connexion avec Strava et la création d'images à partir de vos activités. La base légale est l'exécution de ce service à votre demande.",
        ],
      },
      {
        heading: "Durée de conservation",
        paragraphs: [
          "Votre fiche d'athlète et vos jetons sont conservés tant que votre compte est connecté. Le cache des activités expire sous 24 heures. Les sessions sont supprimées à la déconnexion.",
        ],
      },
      {
        heading: "Où sont stockées les données",
        paragraphs: [
          "Les données sont hébergées sur l'infrastructure de Cloudflare (Cloudflare, Inc., San Francisco, États-Unis), qui peut les traiter dans des centres de données hors de l'Union européenne dans le cadre de ses clauses contractuelles types.",
        ],
      },
      {
        heading: "Vos droits",
        paragraphs: [
          "Vous pouvez révoquer l'accès d'Ofolam à tout moment depuis vos réglages Strava (Mes applications). Nos jetons deviennent alors inutilisables. Pour faire supprimer votre fiche, ou accéder à vos données, les corriger ou les exporter, écrivez à {email}. Vous pouvez aussi saisir la CNIL.",
        ],
      },
      {
        heading: "Strava",
        paragraphs: [
          "Ofolam utilise l'API Strava et n'est pas affilié à Strava. Les conditions et la politique de confidentialité de Strava s'appliquent à votre compte Strava.",
        ],
      },
    ],
  },

  terms: {
    title: "Conditions d'utilisation",
    updated: "Dernière mise à jour : 30 septembre 2026",
    sections: [
      {
        heading: "Le service",
        paragraphs: [
          "Ofolam vous permet de créer des images à partir de vos propres activités Strava et de les partager. Il est fourni gratuitement, en l'état, sans garantie de disponibilité ni d'exactitude. Nous pouvons le modifier ou l'arrêter à tout moment.",
        ],
      },
      {
        heading: "Votre compte",
        paragraphs: [
          "Un compte Strava est nécessaire. Vous êtes responsable des images que vous créez et partagez, et des droits sur les photos que vous y ajoutez.",
        ],
      },
      {
        heading: "Usage acceptable",
        paragraphs: [
          "N'utilisez pas le service pour accéder à des données qui ne vous appartiennent pas, pour surcharger le service ou l'API Strava, ni à des fins illicites.",
        ],
      },
      {
        heading: "Marques",
        paragraphs: [
          "Strava et le logo Strava sont des marques de Strava, Inc. Les images créées avec Ofolam portent la mention « Powered by Strava », exigée par les conditions de l'API Strava. Les données cartographiques sont © les contributeurs OpenStreetMap et le fournisseur de tuiles, crédités sur l'image.",
        ],
      },
      {
        heading: "Responsabilité",
        paragraphs: [
          "Dans la limite permise par la loi, {name} ne saurait être tenu responsable d'un dommage résultant de l'utilisation ou de l'indisponibilité du service.",
        ],
      },
      { heading: "Droit applicable", paragraphs: ["Ces conditions sont régies par le droit français."] },
    ],
  },

  legal: {
    title: "Mentions légales",
    updated: "Dernière mise à jour : 30 septembre 2026",
    sections: [
      { heading: "Éditeur", paragraphs: ["{name}", "Contact : {email}"] },
      {
        heading: "Hébergement",
        paragraphs: ["Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis."],
      },
      { heading: "Code source", paragraphs: ["Ofolam est un logiciel libre, sous licence MIT."] },
    ],
  },
};
