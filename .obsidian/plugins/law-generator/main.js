const { Plugin, Notice } = require("obsidian");

module.exports = class LawGeneratorPlugin extends Plugin {

    async onload() {

        this.addCommand({
            id: "create-law",
            name: "새 법령 만들기",
            callback: () => {
                new Notice("새 법령 만들기 버튼이 정상 작동합니다!");
            }
        });

    }

    onunload() {

    }

}