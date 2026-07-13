module.exports = async (params) => {

    const {quickAddApi, app} = params;

    const lawName = await quickAddApi.inputPrompt("법령명을 입력하세요");

    if (!lawName) return;

    const baseFolder = `법률링크/${lawName}`;

    await app.vault.createFolder(baseFolder);

    await app.vault.create(
        `${baseFolder}/README.md`,
`# ${lawName}

## 📚 법령

- [[법률]]
- [[시행령]]
- [[시행규칙]]

---

## 🏭 GMP

- [[GMP]]
- [[Deviation]]
- [[CAPA]]
- [[OOS]]

---

## 📄 SOP

- SOP-001
`
    );

    await app.vault.create(`${baseFolder}/법률.md`, `# ${lawName} 법률`);
    await app.vault.create(`${baseFolder}/시행령.md`, `# ${lawName} 시행령`);
    await app.vault.create(`${baseFolder}/시행규칙.md`, `# ${lawName} 시행규칙`);

    new Notice(`${lawName} 생성 완료`);
}