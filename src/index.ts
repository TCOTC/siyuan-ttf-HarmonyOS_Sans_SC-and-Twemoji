type PluginI18n = typeof import("./i18n/zh-CN.json");
import "./index.scss";
import {Plugin, Setting, showMessage} from "siyuan";

const STORAGE_KEY = "settings.json";

type FontScope = "both" | "ui" | "editor" | "none";

interface FontConfig {
    fontScope: FontScope;
    emojiFont: boolean;
}

const DEFAULT_CONFIG: FontConfig = {
    fontScope: "both",
    emojiFont: true,
};

// 编辑器内承载字体栈与字重的元素，与 SiYuan 的 setInlineStyle 取值完全一致
// https://github.com/siyuan-note/siyuan/issues/16923
// .b3-typography--default 用于渲染界面内的富文本（读取面板、插件市场说明、更新日志等），
// 按界面文字处理，不含在内，否则「仅编辑器」模式会把界面文字也换成编辑器字体
const EDITOR_SELECTORS = ".b3-typography:not(.b3-typography--default), .protyle-wysiwyg, .protyle-title";

// 界面内直接引用 --b3-font-family 的元素，其余界面元素从 body 继承字体；
// .b3-tooltips::after 为提示气泡文本，.protyle-attr 为编辑器内的块属性浮层
const UI_FONT_SELECTORS = "body, button, input, select, textarea, .b3-tooltips::after, .protyle-attr";

// 表格单元格内的富文本预览与嵌套编辑器位于 th/td 之内，字重必须沿用宿主单元格的声明，
// 例如表头 th 的 600、表体 td 的 normal，不能改用插件下发的字重
const TABLE_CELL_WEIGHT_SELECTORS = ".table__cell-rich, .table__cell-editor .protyle-wysiwyg";

// 鸿蒙黑体只提供 400 与 700 两个字重，沿用「设置 - 外观」中选择的字体字重会触发合成加粗
const DEFAULT_FONT_WEIGHT = 400;

// SiYuan 3.8.2 起字体配置由 appearance.globalFontFamilies 与 editor.fontFamilies 给出，
// 而 siyuan 类型包尚未声明这两个字段，此处按运行时的结构读取
const readFirstFontWeight = (holder: unknown, key: string): number | undefined =>
    (holder as Record<string, Array<{weight?: number}> | undefined>)[key]?.[0]?.weight;

export default class HarmonyOSFontPlugin extends Plugin {
    declare i18n: PluginI18n;

    private readonly overrideStyle = document.createElement("style");
    private config: FontConfig = {...DEFAULT_CONFIG};
    private inlineStyleObserver?: MutationObserver;

    onload() {
        this.loadConfig().then(() => {
            this.initSetting();
            this.applyFontOverrides();
            this.watchInlineStyle();
            this.preloadFonts();
            console.log(this.displayName, "loaded");
        });
    }

    onunload() {
        this.inlineStyleObserver?.disconnect();
        this.overrideStyle.remove();
        console.log(this.displayName, "unloaded");
    }

    async uninstall() {
        this.removeData(STORAGE_KEY).catch(e => {
            const message = `uninstall [${this.name}] remove data [${STORAGE_KEY}] fail: ${e.msg}`;
            showMessage(message, 0, "error");
            console.error(message);
        });
        console.log(this.displayName, "uninstalled");
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
                    ["ui", this.i18n.scopeUI],
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
        const emojiReset = '"Emojis Additional", "Emojis Reset"';
        const emojiStack = emojiFont ? `"Twemoji", ${emojiReset}` : emojiReset;

        const lang = window.siyuan.config.appearance.lang; // 不能用 document.documentElement.lang，因为插件启动时这个属性可能还不存在
        let harmonyOS: string;
        switch (lang) {
            case "ar":
                harmonyOS = `${sans}, ${naskh}, ${sc}`;
                break;
            default:
                harmonyOS = `${sans}, ${sc}, ${naskh}`;
                break;
        }
        let fallback: string;
        switch (lang) {
            case "zh-CN":
                fallback = `${fallbackHead}"PingFang SC", ${fallbackMid}"Microsoft Yahei", "Hiragino Sans GB", "Source Han Sans SC", ${fallbackEnd}`;
                break;
            default:
                fallback = `${fallbackHead}${fallbackMid}${fallbackEnd}`;
                break;
        }

        // 「界面和编辑器」与「编辑器」需要改写 SiYuan 生成的全部字体栈变量，使本插件的字体优先于
        // 「设置 - 外观」中的全局默认字体与编辑器字体：--b3-font-family 由 globalFont.ts 插入用户的
        // 全局默认字体，--b3-font-family-editor 由 setInlineStyle 设为用户的编辑器字体
        // 自定义属性的变量替换在声明它的元素上完成，故 :root 上的字体栈必须整体改写
        // 文字字体排在 emoji 前缀之前，与插件改写变量之前的字体栈顺序保持一致
        // https://github.com/siyuan-note/siyuan/issues/19148
        // https://github.com/siyuan-note/siyuan/issues/16923
        const stack = `${harmonyOS}, var(--b3-font-family-emoji-reset), ${fallback}`;
        // body 等元素与 globalFont.ts 的规则同为元素选择器，靠样式表顺序生效，无需 !important
        const bodyWeight = `font-weight: ${DEFAULT_FONT_WEIGHT}`;
        // 编辑器元素需要压过 setInlineStyle 的 .b3-typography:not(...)（特异性 0,2,0）
        const editorWeight = `${bodyWeight} !important`;
        if (fontScope === "both") {
            // 不使用 :lang() 限定：!important 已足以压过主题与 globalFont.ts 的 :root:root 声明，
            // 而 :lang() 依赖 html 的 lang 属性，该属性在启动早期或导出等场景可能缺失，会使整组规则静默失效
            rules.push(`:root { --b3-font-family-default: ${stack} !important; --b3-font-family-editor: ${stack} !important; --b3-font-family: ${stack} !important; }`);
            // globalFont.ts 会按用户选择的全局字体给以下元素写入 font-weight
            rules.push(`body, button, input, select, textarea { ${bodyWeight}; }`);
        } else if (fontScope === "ui") {
            // 界面元素的字体来自 :root 上的 --b3-font-family，而编辑器元素引用同一个变量，改写该变量
            // 会让本插件的字体进入编辑器与文档，因此改在界面元素上直接声明字体；
            // 字重与字体一并声明，否则界面会沿用「设置 - 外观」中的字体字重，与鸿蒙黑体的可用字重不匹配
            rules.push(`${UI_FONT_SELECTORS} { font-family: ${stack}; ${bodyWeight}; }`);
            // 编辑器元素自身未声明 font-weight 时从 body 继承，故按 SiYuan 的取值恢复，
            // 使界面模式的覆盖不进入编辑器与文档
            const editorFontWeight = readFirstFontWeight(window.siyuan.config.editor, "fontFamilies") ||
                readFirstFontWeight(window.siyuan.config.appearance, "globalFontFamilies") || DEFAULT_FONT_WEIGHT;
            if (editorFontWeight !== DEFAULT_FONT_WEIGHT) {
                rules.push(`${EDITOR_SELECTORS} { font-weight: ${editorFontWeight}; }`);
                // .protyle-wysiwyg 会命中表格单元格内嵌套的编辑器，需恢复为从宿主单元格继承
                rules.push(`${TABLE_CELL_WEIGHT_SELECTORS} { font-weight: inherit; }`);
            }
        } else if (fontScope === "editor") {
            // 这三个变量都会被编辑器元素的 font-family 直接引用，替换在该元素上完成，可以在此覆盖；
            // --b3-font-family-protyle 用于未配置编辑器字体时，--b3-font-family-editor 与
            // --b3-font-family 用于已配置编辑器字体时
            rules.push(`${EDITOR_SELECTORS} { --b3-font-family-protyle: ${stack} !important; --b3-font-family-editor: ${stack} !important; --b3-font-family: ${stack} !important; }`);
        }
        if (fontScope === "both" || fontScope === "editor") {
            // setInlineStyle 会按用户选择的编辑器字体给编辑器元素写入 font-weight
            rules.push(`${EDITOR_SELECTORS} { ${editorWeight}; }`);
            // 表格单元格内的内容沿用宿主单元格的字重，避免覆盖表头 th 的 600 等声明；
            // 上面的 important 声明会命中单元格内嵌套的 .protyle-wysiwyg，故此处同样需要 important
            rules.push(`${TABLE_CELL_WEIGHT_SELECTORS} { font-weight: inherit !important; }`);
        }

        if (emojiFont) {
            // emoji 前缀由该变量承载，覆盖它 Twemoji 才能排在 "Emojis Additional" 之前
            rules.push(`:root { --b3-font-family-emoji-reset: ${emojiStack} !important; }`);
            // "Emojis Icon" 由主题在 Windows 11 上声明，图标位依赖其字形墨迹对齐，需要保留
            rules.push(':root { --b3-font-family-emoji: "Twemoji", "Emojis Additional", "Emojis Icon", emojis !important; }');
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

    // 「界面」模式按 SiYuan 的字体字重恢复编辑器元素的字重，而 SiYuan 在字体设置变化时会原地
    // 重写 #siyuanStyle（setInlineStyle），插件规则会停留在旧值，故监听该元素并在内容变化时
    // 重新生成规则；该元素由 onGetConfig 创建，晚于插件加载，未出现时先监听 head
    private watchInlineStyle() {
        const observeElement = (siyuanStyle: HTMLElement) => {
            this.inlineStyleObserver?.disconnect();
            this.inlineStyleObserver = new MutationObserver(() => this.applyFontOverrides());
            this.inlineStyleObserver.observe(siyuanStyle, {childList: true});
        };
        const siyuanStyle = document.getElementById("siyuanStyle");
        if (siyuanStyle) {
            observeElement(siyuanStyle);
            return;
        }
        this.inlineStyleObserver = new MutationObserver(() => {
            const element = document.getElementById("siyuanStyle");
            if (element) {
                observeElement(element);
            }
        });
        this.inlineStyleObserver.observe(document.head, {childList: true});
    }

    private preloadFonts() {
        if (!document.fonts || typeof document.fonts.load !== "function") {
            return;
        }
        // 「不使用插件字体」只关闭文字字体，emoji 仍是独立开关，需要单独预加载
        if (this.config.fontScope === "none" && !this.config.emojiFont) {
            return;
        }
        const loadTextFont = this.config.fontScope !== "none";
        setTimeout(() => {
            try {
                if (loadTextFont) {
                    document.fonts.load('400 16px "HarmonyOS Sans"', "1");
                    document.fonts.load('700 16px "HarmonyOS Sans"', "2");
                    document.fonts.load('italic 400 16px "HarmonyOS Sans"', "3");
                    document.fonts.load('italic 700 16px "HarmonyOS Sans"', "4");
                }
                if (this.config.emojiFont) {
                    document.fonts.load('400 16px "Twemoji"', "😀");
                }
            } catch (_) {
                // 预加载失败不影响字体使用，实际渲染时仍会按需拉取
            }
        }, 0);
    }
}
