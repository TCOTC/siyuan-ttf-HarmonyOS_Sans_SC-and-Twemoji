type PluginI18n = typeof import("./i18n/zh_CN.json");
import "./index.scss";
import {Plugin, Setting, showMessage} from "siyuan";

const STORAGE_KEY = "settings.json";

type FontScope = "both" | "editor" | "none";

interface FontConfig {
    fontScope: FontScope;
    emojiFont: boolean;
}

const DEFAULT_CONFIG: FontConfig = {
    fontScope: "both",
    emojiFont: true,
};

export default class HarmonyOSFontPlugin extends Plugin {
    declare i18n: PluginI18n;

    private readonly overrideStyle = document.createElement("style");
    private config: FontConfig = {...DEFAULT_CONFIG};

    onload() {
        this.loadConfig().then(() => {
            this.initSetting();
            this.applyFontOverrides();
            this.preloadFonts();
            console.log(this.displayName, "loaded");
        });
    }

    onunload() {
        this.overrideStyle.remove();
        console.log(this.displayName, "unloaded");
    }

    openSetting() {
        this.setting.open(this.displayName);
    }

    private async loadConfig() {
        try {
            const data = await this.loadData(STORAGE_KEY) as Partial<FontConfig>;
            this.config = {...DEFAULT_CONFIG, ...data};
        } catch (_) {
            this.config = {...DEFAULT_CONFIG};
        }
    }

    private initSetting() {
        let fontScopeSelect: HTMLSelectElement;
        let emojiSwitch: HTMLInputElement;
        const readSettingForm = (): FontConfig => ({
            fontScope: fontScopeSelect.value as FontScope,
            emojiFont: emojiSwitch.checked,
        });
        const preview = () => this.applyFontOverrides(readSettingForm());

        this.setting = new Setting({
            destroyCallback: () => {
                this.applyFontOverrides();
            },
            confirmCallback: () => {
                this.config = readSettingForm();
                this.applyFontOverrides();
                this.preloadFonts();
                this.saveData(STORAGE_KEY, this.config).catch(err => {
                    const message = this.displayName + " " + this.i18n.saveFailed + ": " + err;
                    showMessage(message, 0, "error");
                    console.error(message);
                });
            },
        });

        this.setting.addItem({
            title: this.i18n.scopeTitle,
            description: this.i18n.scopeDesc,
            createActionElement: () => {
                fontScopeSelect = document.createElement("select");
                fontScopeSelect.className = "b3-select fn__flex-center fn__size200";
                const fontScopeOptions: [FontScope, string][] = [
                    ["both", this.i18n.scopeBoth],
                    ["editor", this.i18n.scopeEditor],
                    ["none", this.i18n.scopeNone],
                ];
                for (const [scope, label] of fontScopeOptions) {
                    const option = document.createElement("option");
                    option.value = scope;
                    option.textContent = label;
                    fontScopeSelect.appendChild(option);
                }
                fontScopeSelect.value = this.config.fontScope;
                fontScopeSelect.addEventListener("change", preview);
                return fontScopeSelect;
            },
        });

        this.setting.addItem({
            title: this.i18n.emojiTitle,
            description: this.i18n.emojiDesc,
            createActionElement: () => {
                emojiSwitch = document.createElement("input");
                emojiSwitch.type = "checkbox";
                emojiSwitch.className = "b3-switch fn__flex-center fn__size200";
                emojiSwitch.checked = this.config.emojiFont;
                emojiSwitch.addEventListener("change", preview);
                return emojiSwitch;
            },
        });
    }

    private applyFontOverrides(config: FontConfig = this.config) {
        const {fontScope, emojiFont} = config;
        const rules: string[] = [];
        const sans = '"HarmonyOS Sans"';
        const sc = '"HarmonyOS Sans SC"';
        const naskh = '"HarmonyOS Sans Naskh Arabic"';
        const fallbackHead = "BlinkMacSystemFont, Helvetica, ";
        const fallbackMid = '"Luxi Sans", "DejaVu Sans", arial, ';
        const fallbackEnd = "sans-serif, emojis";
        const emojiReset = '"Emojis Additional", "Emojis Reset", ';
        const emoji = emojiFont ? `"Twemoji", ${emojiReset}` : emojiReset;

        const lang = window.siyuan.config.appearance.lang; // 不能用 document.documentElement.lang，因为插件启动时这个属性可能还不存在
        let harmonyOS: string;
        switch (lang) {
            case "ar_SA":
                harmonyOS = `${sans}, ${naskh}, ${sc}`;
                break;
            default:
                harmonyOS = `${sans}, ${sc}, ${naskh}`;
                break;
        }
        let fallback: string;
        switch (lang) {
            case "zh_CN":
                fallback = `${fallbackHead}"PingFang SC", ${fallbackMid}"Microsoft Yahei", "Hiragino Sans GB", "Source Han Sans SC", ${fallbackEnd}`;
                break;
            default:
                fallback = `${fallbackHead}${fallbackMid}${fallbackEnd}`;
                break;
        }
        const stack = `${harmonyOS}, ${emoji}${fallback}`;
        const parts: string[] = [];
        if (fontScope === "both") {
            parts.push(`--b3-font-family: ${stack} !important`);
        }
        if (["both", "editor"].includes(fontScope)) {
            parts.push(`--b3-font-family-protyle: ${stack} !important`);
        }
        if (parts.length) {
            rules.push(`:root:lang(${lang}) { ${parts.join("; ")}; }`);
        }

        if (emojiFont) {
            rules.push(':root { --b3-font-family-emoji: "Twemoji", "Emojis Additional", emojis !important; }');
        }

        // id 以 snippetCSS 开头的 style 元素会被添加到导出 PDF 中
        // https://github.com/siyuan-note/siyuan/commit/4318aa446369eaf4ea85982ba4919b5d47340552
        // https://github.com/siyuan-note/siyuan/commit/0361599aba79a200c410aa9de5873da4a52b2667
        this.overrideStyle.id = "snippetCSS-" + this.name + "-override";
        this.overrideStyle.textContent = rules.join("\n");
        if (rules.length) {
            if (!this.overrideStyle.isConnected) {
                document.head.appendChild(this.overrideStyle);
            }
        } else {
            this.overrideStyle.remove();
        }
    }

    private preloadFonts() {
        if (this.config.fontScope === "none" || !document.fonts || typeof document.fonts.load !== "function") {
            return;
        }
        setTimeout(() => {
            try {
                document.fonts.load('400 16px "HarmonyOS Sans"', "1");
                document.fonts.load('700 16px "HarmonyOS Sans"', "2");
                document.fonts.load('italic 400 16px "HarmonyOS Sans"', "3");
                document.fonts.load('italic 700 16px "HarmonyOS Sans"', "4");
                if (this.config.emojiFont) {
                    document.fonts.load('400 16px "Twemoji"', "5");
                }
            } catch (_) {}
        }, 0);
    }
}
