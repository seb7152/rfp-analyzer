# 🧪 Phase 1.2 - Testing Tools avec MCP Inspector

**Status**: ✅ Implémenté - Prêt à tester  
**Date**: 2026-01-02  
**Tools disponibles**: 3 (test_connection, get_rfps, get_requirements, list_suppliers)

---

## 🚀 Quick Start (2 minutes)

### Terminal 1 - Lancer le serveur

```bash
cd mcp-server
npm run dev
```

Attend le message:

```
▲ Next.js 14.x
- Local:        http://localhost:3000
```

### Terminal 2 - Lancer MCP Inspector

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/api/mcp
```

Puis ouvre ton navigateur: **http://localhost:3000** (si non ouvert automatiquement)

---

## ✅ Checklist de Test Basique (5 minutes)

### 1️⃣ Test de Connexion

- [ ] Tool `test_connection` aparaît dans la liste
- [ ] Clique "Invoke" sans paramètres
- [ ] Reçois le message "✅ Connexion réussie"

### 2️⃣ Récupérer les RFPs

- [ ] Tool `get_rfps` aparaît dans la liste
- [ ] Paramètres optionnels: limit=50, offset=0
- [ ] Clique "Invoke"
- [ ] Reçois une liste de 3 RFPs (rfp-001, rfp-002, rfp-003)
- [ ] Pagination metadata présent (total: 3, has_more: false)

### 3️⃣ Récupérer les Exigences

- [ ] Tool `get_requirements` aparaît
- [ ] Paramètre obligatoire: `rfp_id`
- [ ] Remplis: rfp_id = "rfp-001"
- [ ] Clique "Invoke"
- [ ] Reçois 8 exigences (domaines: Sécurité, Infrastructure, Performance)

### 4️⃣ Récupérer les Fournisseurs

- [ ] Tool `list_suppliers` aparaît
- [ ] Remplis: rfp_id = "rfp-001"
- [ ] Clique "Invoke"
- [ ] Reçois 4 fournisseurs avec scores

---

## 📊 Données de Test

### RFPs Disponibles

```
rfp-001: Infrastructure Cloud 2026
  - 45 exigences
  - 3 fournisseurs
  - Status: active

rfp-002: Solution CRM
  - 38 exigences
  - 4 fournisseurs
  - Status: active

rfp-003: Plateforme Analytics
  - 52 exigences
  - 2 fournisseurs
  - Status: draft
```

### Domaines d'Exigences

```
Sécurité: 3 exigences
  - SEC-1.1.1: Authentification Multi-Facteur
  - SEC-1.1.2: Chiffrement des données en transit
  - SEC-1.2.1: Conformité RGPD

Infrastructure: 2 exigences
  - INFRA-2.1.1: Haute Disponibilité 99.9%
  - INFRA-2.1.2: Scalabilité automatique

Performance: 2 exigences
  - PERF-3.1.1: Temps de réponse < 200ms
  - PERF-3.2.1: Support 10,000 utilisateurs concurrents
```

### Fournisseurs

```
supplier-001: CloudTech Solutions
  - Status: active
  - Score moyen: 4.2 ⭐
  - Réponses: 45/45 (100%)

supplier-002: SecureNet Corp
  - Status: active
  - Score moyen: 3.8 ⭐
  - Réponses: 45/45 (100%)

supplier-003: Infrastructure Plus
  - Status: active
  - Score moyen: 3.5 ⭐
  - Réponses: 25/45 (56%)

supplier-004: Global Services Ltd
  - Status: pending
  - Score: N/A
  - Réponses: 12/45 (27%)
```

---

## 🎯 Scénarios de Test Avancés

### Test 1: Pagination

```
1. Appelle get_rfps avec limit=2, offset=0
   → Reçois 2 RFPs (has_more: true)

2. Appelle get_rfps avec limit=2, offset=2
   → Reçois 1 RFP (has_more: false)

3. Vérifier les métadonnées pagination
```

### Test 2: Filtrage par Domaine

```
1. Appelle get_requirements avec:
   - rfp_id: "rfp-001"
   - domain: "Sécurité"
   → Reçois 3 exigences (SEC-1.1.1, SEC-1.1.2, SEC-1.2.1)

2. Appelle avec domain: "Infrastructure"
   → Reçois 2 exigences

3. Appelle avec domain: "Performance"
   → Reçois 2 exigences

4. Appelle sans domain
   → Reçois tous (8 exigences)
```

### Test 3: Exploration Complète

```
1. get_rfps → Récupérer RFPs
2. Copier ID (ex: rfp-001)
3. get_requirements avec rfp_id
   → Voir exigences
4. list_suppliers avec rfp_id
   → Voir fournisseurs
5. Vérifier que tous les outils retournent la pagination
```

---

## 🐛 Troubleshooting

### "Cannot reach server"

```bash
# Vérifier le serveur est lancé
curl http://localhost:3000/api/mcp

# Si erreur 404, le serveur n'est pas prêt
# Attendre quelques secondes et réessayer

# Si erreur connexion, vérifier:
npm run dev  # Est-ce que cela s'exécute?
```

### "Tool not found"

```bash
# Vérifier que registerAllTools() est appelé
# Vérifier la console du serveur (npm run dev terminal)
# Relancer: Ctrl+C puis npm run dev
```

### "Invalid parameters"

```bash
# Pour get_requirements:
# - rfp_id est OBLIGATOIRE
# - domain est optionnel

# Format JSON correct:
{
  "rfp_id": "rfp-001",
  "domain": "Sécurité"  // optionnel
}
```

### "Pagination not working"

```bash
# Vérifier la réponse contient:
{
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 3,
    "has_more": false
  }
}

# Si manquante, checker les logs du serveur
```

---

## 📝 Notes Importantes

### Données Mockées

- ✅ Toutes les données sont en mémoire (mockées)
- ✅ Pas de base de données réelle
- ✅ Les changements ne persistent pas
- ✅ Parfait pour tester la structure

### Étapes Suivantes

- [ ] Remplacer les données mockées par Supabase réel
- [ ] Implémenter RLS pour l'isolation multi-tenant
- [ ] Ajouter les tests unitaires

### Logging

- Les logs apparaissent dans le terminal `npm run dev`
- Chaque tool loggue: action, paramètres, résultats
- Format: `[timestamp] [LEVEL] [module]: message`

---

## 🎓 Structure du Code

```
lib/mcp/tools/
├── index.ts                    # Registration des tools
├── rfp/
│   └── get-rfps.ts            # Tool: get_rfps
├── requirements/
│   └── get-requirements.ts    # Tool: get_requirements
└── suppliers/
    └── list-suppliers.ts      # Tool: list_suppliers

app/api/mcp/[transport]/route.ts
└── Enregistre les tools avec registerAllTools()
```

---

## ✨ Résultats Attendus

### Succès ✅

- Tous les tools aparaissent dans MCP Inspector
- Chaque tool retourne une réponse JSON valide
- Pagination métadonnées présentes
- Filtrage par domaine fonctionne
- Logging visible dans le serveur

### En Cas d'Erreur ❌

- Consulter les logs du serveur (terminal npm run dev)
- Vérifier la console du navigateur
- Vérifier que les paramètres sont corrects
- Relancer le serveur

---

## 📞 Support

**Questions?**

1. Consulter `MCP_INSPECTOR_GUIDE.md` pour les détails complets
2. Vérifier les logs du serveur
3. Relancer le serveur

**Prochaines phases:**

- Phase 1.3: Requirements Resources (tree builder)
- Phase 1.4: Suppliers Resources
- Phase 2: Scores & Moyennes (Supabase réel)

---

**Créé**: 2026-01-02  
**Statut**: ✅ Tools implémentés et prêts à tester
