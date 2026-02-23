const content = `
- [ ] Détail concret des types de profils administrateurs et du modèle de gestion des droits
- [ ] Références projets et preuve d'intégration API avec Interparking ou parkings publics (endpoints, payloads, auth, SLA)
- [ ] Engagement et plan pour évoluer vers une intégration API Interparking (incluant décommissionnement E-039)
`;
const processedContent = content
    // Fix "- []" or "-[]" -> "- [ ] "
    .replace(/^(\s*)-\s*\[\s*\]\s*/gm, "$1- [ ] ")
    // Fix "- [x]" or "-[x]" -> "- [x] "
    .replace(/^(\s*)-\s*\[x\]\s*/gmi, "$1- [x] ")
    // Fix headers without space like "#3. Roadmap" -> "### 3. Roadmap"
    .replace(/^#(\d+\.)/gm, "### $1");
console.log(processedContent);
