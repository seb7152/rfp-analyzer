// Fake data for RFP mockup

export interface Requirement {
  id: string;
  title: string;
  description: string;
  context: string;
  weight: number;
  level: number;
  parentId?: string;
  children?: Requirement[];
}

export interface Supplier {
  id: string;
  name: string;
}

export interface Response {
  id: string;
  requirementId: string;
  supplierId: string;
  responseText: string;
  aiScore: number; // 0-5
  manualScore?: number; // 0-5
  aiComment: string;
  manualComment?: string;
  question?: string;
  isAnalyzed: boolean;
}

// Hierarchical requirements structure
export const requirementsData: Requirement[] = [
  {
    id: "DOM-1",
    title: "Infrastructure et Sécurité",
    description: "Domaine 1",
    context: "",
    weight: 0.25,
    level: 1,
    children: [
      {
        id: "CAT-1.1",
        title: "Sécurité des données",
        description: "Catégorie 1.1",
        context: "",
        weight: 0.15,
        level: 2,
        parentId: "DOM-1",
        children: [
          {
            id: "SUB-1.1.1",
            title: "Chiffrement",
            description: "Sous-catégorie 1.1.1",
            context: "",
            weight: 0.08,
            level: 3,
            parentId: "CAT-1.1",
            children: [
              {
                id: "REQ-001",
                title: "Chiffrement des données en transit (TLS 1.3)",
                description: `Le système doit utiliser TLS 1.3 minimum pour toutes les communications en transit:
• Support obligatoire de TLS 1.3 pour tous les protocoles réseau (HTTPS, gRPC, WebSocket)
• Dépréciation de TLS 1.2 et versions antérieures selon le calendrier défini
• Perfect Forward Secrecy (PFS) activé sur tous les flux de données sensibles
• Certificats valides émis par autorités de certification reconnues avec gestion automatique`,
                context: `Conformément à la réglementation RGPD (Article 32) et aux standards de sécurité bancaires, toutes les données en transit doivent être chiffrées avec TLS 1.3 ou supérieur. Cette exigence s'applique à l'ensemble des communications réseau, incluant les connexions entre les serveurs, les communications avec les clients, et les intégrations avec les systèmes tiers.

La sécurité en transit est critique car elle protège les données contre les attaques man-in-the-middle et l'interception non autorisée. Les données transitant par des réseaux publics ou semi-publics doivent être particulièrement bien protégées.

Les directives de sécurité de l'organisation exigent l'utilisation de TLS 1.3 pour tous les nouveaux services et le dépréciation programmée de TLS 1.2 d'ici fin 2025. Les certificats SSL/TLS doivent être émis par des autorités de certification reconnues et validés régulièrement.

De plus, le système doit supporter les Perfect Forward Secrecy (PFS) et les cipher suites modernes recommandées par l'OWASP. Les communications doivent être configurées avec les paramètres Diffie-Hellman appropriés et les certificats doivent être gérés de manière sécurisée avec rotation automatique avant expiration.`,
                weight: 0.08,
                level: 4,
                parentId: "SUB-1.1.1",
              },
              {
                id: "REQ-002",
                title: "Chiffrement des données au repos (AES-256)",
                description:
                  "Le système doit chiffrer les données au repos avec AES-256.",
                context:
                  "Les données stockées en base de données doivent être chiffrées avec AES-256 pour protéger contre les accès non autorisés.",
                weight: 0.07,
                level: 4,
                parentId: "SUB-1.1.1",
              },
            ],
          },
          {
            id: "SUB-1.1.2",
            title: "Authentification",
            description: "Sous-catégorie 1.1.2",
            context: "",
            weight: 0.07,
            level: 3,
            parentId: "CAT-1.1",
            children: [
              {
                id: "REQ-003",
                title: "Authentification multi-facteur (MFA)",
                description:
                  "Le système doit supporter l'authentification multi-facteur pour tous les utilisateurs.",
                context:
                  "Selon les recommandations de cybersécurité, l'authentification MFA est obligatoire pour l'accès administrateur.",
                weight: 0.07,
                level: 4,
                parentId: "SUB-1.1.2",
              },
            ],
          },
        ],
      },
      {
        id: "CAT-1.2",
        title: "Infrastructure Cloud",
        description: "Catégorie 1.2",
        context: "",
        weight: 0.1,
        level: 2,
        parentId: "DOM-1",
        children: [
          {
            id: "SUB-1.2.1",
            title: "Disponibilité",
            description: "Sous-catégorie 1.2.1",
            context: "",
            weight: 0.1,
            level: 3,
            parentId: "CAT-1.2",
            children: [
              {
                id: "REQ-004",
                title: "SLA de disponibilité 99.95%",
                description:
                  "Le service doit garantir une disponibilité de 99.95% sur une période de 12 mois.",
                context:
                  "Le contrat de service doit inclure une garantie de disponibilité minimale avec des pénalités de non-conformité.",
                weight: 0.1,
                level: 4,
                parentId: "SUB-1.2.1",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "DOM-2",
    title: "Performance et Scalabilité",
    description: "Domaine 2",
    context: "",
    weight: 0.2,
    level: 1,
    children: [
      {
        id: "CAT-2.1",
        title: "Performances",
        description: "Catégorie 2.1",
        context: "",
        weight: 0.2,
        level: 2,
        parentId: "DOM-2",
        children: [
          {
            id: "SUB-2.1.1",
            title: "Temps de réponse",
            description: "Sous-catégorie 2.1.1",
            context: "",
            weight: 0.2,
            level: 3,
            parentId: "CAT-2.1",
            children: [
              {
                id: "REQ-005",
                title: "Temps de réponse < 500ms",
                description:
                  "Les requêtes API doivent répondre en moins de 500ms pour 95% des cas.",
                context:
                  "Les performances sont critiques pour l'expérience utilisateur. Un délai de plus de 500ms est considéré comme inacceptable.",
                weight: 0.2,
                level: 4,
                parentId: "SUB-2.1.1",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "DOM-3",
    title: "Fonctionnalités Métier",
    description: "Domaine 3",
    context: "",
    weight: 0.55,
    level: 1,
    children: [
      {
        id: "CAT-3.1",
        title: "Gestion des utilisateurs",
        description: "Catégorie 3.1",
        context: "",
        weight: 0.15,
        level: 2,
        parentId: "DOM-3",
        children: [
          {
            id: "SUB-3.1.1",
            title: "Rôles et permissions",
            description: "Sous-catégorie 3.1.1",
            context: "",
            weight: 0.15,
            level: 3,
            parentId: "CAT-3.1",
            children: [
              {
                id: "REQ-006",
                title: "Système de rôles granulaires",
                description:
                  "Le système doit supporter des rôles granulaires avec permissions spécifiques.",
                context:
                  "Chaque utilisateur doit pouvoir être assigné à un rôle avec des permissions précises (lecture, écriture, suppression).",
                weight: 0.15,
                level: 4,
                parentId: "SUB-3.1.1",
              },
            ],
          },
        ],
      },
      {
        id: "CAT-3.2",
        title: "Analyse et Reporting",
        description: "Catégorie 3.2",
        context: "",
        weight: 0.4,
        level: 2,
        parentId: "DOM-3",
        children: [
          {
            id: "SUB-3.2.1",
            title: "Tableaux de bord",
            description: "Sous-catégorie 3.2.1",
            context: "",
            weight: 0.25,
            level: 3,
            parentId: "CAT-3.2",
            children: [
              {
                id: "REQ-007",
                title: "Dashboard de synthèse des RFP",
                description:
                  "Affichage d'un dashboard montrant l'état de tous les RFP en cours.",
                context:
                  "Les managers doivent pouvoir visualiser rapidement le statut de tous les appels d'offres en cours.",
                weight: 0.25,
                level: 4,
                parentId: "SUB-3.2.1",
              },
            ],
          },
          {
            id: "SUB-3.2.2",
            title: "Export de données",
            description: "Sous-catégorie 3.2.2",
            context: "",
            weight: 0.15,
            level: 3,
            parentId: "CAT-3.2",
            children: [
              {
                id: "REQ-008",
                title: "Export Excel des analyses",
                description:
                  "Possibilité d'exporter les analyses en format Excel avec tous les détails.",
                context:
                  "Les rapports doivent pouvoir être exportés en Excel pour partage avec les parties prenantes.",
                weight: 0.15,
                level: 4,
                parentId: "SUB-3.2.2",
              },
            ],
          },
        ],
      },
    ],
  },
];

export const suppliersData: Supplier[] = [
  { id: "SUP-A", name: "TechCorp Solutions" },
  { id: "SUP-B", name: "CloudFirst Inc" },
  { id: "SUP-C", name: "SecureData Ltd" },
  { id: "SUP-D", name: "GlobalTech Group" },
];

// Generate responses for all requirement/supplier combinations
export const generateResponses = (): Response[] => {
  const responses: Response[] = [];
  const requirementsFlat = flattenRequirements(requirementsData);

  const responseTexts = {
    "REQ-001": [
      "Nous utilisons TLS 1.3 pour toutes les communications. Cela est intégré dans notre infrastructure depuis 2020.",
      "TLS 1.3 est implémenté de manière native dans notre solution. Conformité totale à la norme.",
      "Infrastructure basée sur TLS 1.3 avec certificats gérés automatiquement.",
      "Support complet de TLS 1.3 avec rotation de certificats tous les 90 jours.",
    ],
    "REQ-002": [
      "Chiffrement AES-256 pour toutes les données au repos, avec clés gérées par Google Cloud KMS.",
      "AES-256 en base de données avec TDEQ (Transparent Database Encryption).",
      "Données chiffrées avec AES-256, clés dans un HSM sécurisé.",
      "Double chiffrement : AES-256 au niveau application + KMS provider.",
    ],
    "REQ-003": [
      "MFA obligatoire avec support TOTP et FIDO2. Authentification biométrique disponible.",
      "MFA par SMS, email et authenticateur. Accès administrateur requiert MFA.",
      "TOTP et push notifications pour MFA. Audit logging complet.",
      "MFA 30 jours, support hardware keys.",
    ],
    "REQ-004": [
      "Disponibilité garantie 99.99% avec SLA de $1000/jour de non-conformité.",
      "99.95% avec infrastructure multi-région et failover automatique.",
      "99.95% garantie avec monitoring 24/7 et alertes temps réel.",
      "99.9% avec redondance géographique et backup continu.",
    ],
    "REQ-005": [
      "Temps de réponse < 200ms pour 95% des requêtes avec cache Redis distribué.",
      "< 350ms en moyenne avec optimisation des requêtes et CDN global.",
      "< 250ms avec edge computing et caching intelligent.",
      "< 400ms pour la majorité des opérations.",
    ],
    "REQ-006": [
      "Système RBAC complet avec 15 rôles prédéfinis et rôles customisables.",
      "RBAC avec permissions granulaires au niveau objet.",
      "Support complet des rôles avec délégation de permissions.",
      "6 rôles standard, possibilité de créer des rôles custom.",
    ],
    "REQ-007": [
      "Dashboard personnalisable avec widgets temps réel et export automatique.",
      "Dashboard avec KPIs, tendances et alertes.",
      "Dashboard complet avec drill-down et filtres avancés.",
      "Vue d'ensemble simple avec indicateurs clés.",
    ],
    "REQ-008": [
      "Export Excel complet avec pivot tables et graphiques intégrés.",
      "Export Excel avec formatage automatique et macros.",
      "Export Excel simple avec données brutes et résumés.",
      "Export Excel avec templates prédéfinis.",
    ],
  };

  requirementsFlat.forEach((req) => {
    suppliersData.forEach((supplier, supplierIndex) => {
      const responseKey = req.id as keyof typeof responseTexts;
      const responseList = responseTexts[responseKey] || [
        "Réponse générique à cette exigence.",
        "Nous répondons à cette exigence.",
        "Capacité présente dans notre solution.",
        "Fonctionnalité disponible.",
      ];

      const aiScore = Math.floor(Math.random() * 5) + 1; // 1-5
      const isAnalyzed = Math.random() > 0.2; // 80% analyzed

      responses.push({
        id: `RESP-${req.id}-${supplier.id}`,
        requirementId: req.id,
        supplierId: supplier.id,
        responseText: responseList[supplierIndex] || responseList[0],
        aiScore,
        aiComment: [
          "Réponse complète et bien documentée.",
          "Manque de détails sur l'implémentation.",
          "Réponse satisfaisante mais générique.",
          "Excellente réponse avec cas d'usage.",
          "Réponse incomplète, nécessite clarification.",
        ][aiScore - 1],
        isAnalyzed,
      });
    });
  });

  return responses;
};

export function flattenRequirements(reqs: Requirement[]): Requirement[] {
  const result: Requirement[] = [];

  function traverse(req: Requirement) {
    result.push(req);
    if (req.children) {
      req.children.forEach(traverse);
    }
  }

  reqs.forEach(traverse);
  return result;
}

export function getRequirementById(
  id: string,
  reqs: Requirement[] = requirementsData,
): Requirement | undefined {
  const flat = flattenRequirements(reqs);
  return flat.find((r) => r.id === id);
}

export function getRequirementPath(
  id: string,
  reqs: Requirement[] = requirementsData,
): Requirement[] {
  const path: Requirement[] = [];
  const flat = flattenRequirements(reqs);

  let current = flat.find((r) => r.id === id);
  while (current) {
    path.unshift(current);
    current = current.parentId
      ? flat.find((r) => r.id === current?.parentId)
      : undefined;
  }

  return path;
}
