import { App, Modal, Plugin, PluginSettingTab, Setting, Notice, TFolder } from 'obsidian';

// 플러그인 설정 정의 인터페이스
interface LawGeneratorSettings {
	lawDirectory: string;
	templatesDirectory: string;
}

// 기본 설정값
const DEFAULT_SETTINGS: LawGeneratorSettings = {
	lawDirectory: '대한민국 법률',
	templatesDirectory: 'Templates'
}

export default class LawGeneratorPlugin extends Plugin {
	settings: LawGeneratorSettings;

	async onload() {
		await this.loadSettings();

		// 1. 명령 팔레트에 등록 (Ctrl + P -> "새 법령 만들기")
		this.addCommand({
			id: 'create-new-law',
			name: '새 법령 만들기',
			callback: () => {
				new LawInputDialog(this.app, async (lawName) => {
					await this.generateLawFiles(lawName);
				}).open();
			}
		});

		// 2. 리본 아이콘 추가 (왼쪽 사이드바 버튼)
		this.addRibbonIcon('document', '새 법령 만들기', (evt: MouseEvent) => {
			new LawInputDialog(this.app, async (lawName) => {
				await this.generateLawFiles(lawName);
			}).open();
		});

		// 3. 설정 탭 추가
		this.addSettingTab(new LawGeneratorSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// 핵심 엔진: 폴더 트리 및 파일 3개(+README) 생성 로직
	async generateLawFiles(lawName: string) {
		const { vault } = this.app;
		const baseDir = this.settings.lawDirectory;
		const templatesDir = this.settings.templatesDirectory;
		const targetFolderPath = `${baseDir}/${lawName}`;

		try {
			// 1. 대상 폴더 생성
			await this.ensureFolderExists(targetFolderPath);

			// 2. 생성할 파일 및 템플릿 매핑 목록
			const filesToCreate = [
				{ fileName: 'README.md', templateName: 'README Template.md' },
				{ fileName: '법률.md', templateName: '법률 Template.md' },
				{ fileName: '시행령.md', templateName: '시행령 Template.md' },
				{ fileName: '시행규칙.md', templateName: '시행규칙 Template.md' },
			];

			for (const file of filesToCreate) {
				const filePath = `${targetFolderPath}/${file.fileName}`;
				const fileExists = vault.getAbstractFileByPath(filePath);

				if (fileExists) {
					continue; // 파일이 이미 있으면 덮어쓰지 않고 넘어갑니다.
				}

				// 템플릿 읽기 및 플레이스홀더 치환
				const templatePath = `${templatesDir}/${file.templateName}`;
				let fileContent = '';

				try {
					const templateFile = vault.getAbstractFileByPath(templatePath);
					if (templateFile && 'read' in templateFile) {
						// @ts-ignore
						const rawContent = await vault.read(templateFile);
						// {{VALUE:법령명}} 패턴을 입력한 법령명으로 치환
						fileContent = rawContent.replace(/\{\{VALUE:법령명\}\}/g, lawName);
					} else {
						// 템플릿 파일이 없을 때 기본 껍데기 내용 구성
						if (file.fileName === 'README.md') {
							fileContent = `# ${lawName}\n\n## 법령\n-[[법률]]\n-[[시행령]]\n-[[시행규칙]]`;
						} else {
							fileContent = `# ${lawName} ${file.fileName.replace('.md', '')}\n\n여기에 내용을 입력하세요.`;
						}
					}
				} catch (err) {
					new Notice(`템플릿 읽기 실패: ${file.templateName}. 기본 내용으로 생성합니다.`);
				}

				// 실제 마크다운 파일 생성
				await vault.create(filePath, fileContent);
			}

			new Notice(`🎉 '${lawName}' 법령 폴더 및 3단 파일이 성공적으로 생성되었습니다!`);

		} catch (error) {
			console.error(error);
			new Notice(`❌ 생성 실패: ${error.message}`);
		}
	}

	// 폴더 존재 여부 확인 후 없으면 순차 생성하는 헬퍼 함수
	async ensureFolderExists(path: string) {
		const { vault } = this.app;
		const parts = path.split('/');
		let currentPath = '';

		for (const part of parts) {
			if (!part) continue;
			currentPath = currentPath ? `${currentPath}/${part}` : part;
			const folder = vault.getAbstractFileByPath(currentPath);
			if (!folder) {
				await vault.createFolder(currentPath);
			}
		}
	}
}

// 법령명 입력을 받기 위한 모달 다이얼로그 클래스
class LawInputDialog extends Modal {
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '새 법령 파일 생성' });

		let lawName = '';
		
		new Setting(contentEl)
			.setName('법령명 입력')
			.setDesc('생성하고자 하는 법령의 이름을 입력하세요 (예: 민법, 근로기준법)')
			.addText((text) =>
				text.onChange((value) => {
					lawName = value;
				})
			);

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('생성하기')
					.setCta()
					.onClick(() => {
						if (!lawName.trim()) {
							new Notice('⚠️ 법령명을 입력해 주세요!');
							return;
						}
						this.close();
						this.onSubmit(lawName.trim());
					})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// 설정 화면 UI 클래스
class LawGeneratorSettingTab extends PluginSettingTab {
	plugin: LawGeneratorPlugin;

	constructor(app: App, plugin: LawGeneratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Law Generator 설정' });

		new Setting(containerEl)
			.setName('법령 저장 폴더 경로')
			.setDesc('생성된 법령 폴더들이 저장될 최상위 경로입니다.')
			.addText((text) =>
				text
					.setPlaceholder('대한민국 법률')
					.setValue(this.plugin.settings.lawDirectory)
					.onChange(async (value) => {
						this.plugin.settings.lawDirectory = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('템플릿 폴더 경로')
			.setDesc('템플릿 파일(README, 법률, 시행령, 시행규칙 Template.md)들이 위치한 폴더입니다.')
			.addText((text) =>
				text
					.setPlaceholder('Templates')
					.setValue(this.plugin.settings.templatesDirectory)
					.onChange(async (value) => {
						this.plugin.settings.templatesDirectory = value;
						await this.plugin.saveSettings();
					})
			);
	}
}