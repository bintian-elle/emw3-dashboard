import type { LocalizedText } from "./script-lab-project";

type SampleScene = {
  time: string;
  visual: LocalizedText;
  voiceover: string;
  translation: string;
  subtitle?: string;
  subtitleTranslation?: string;
  visualPrompt?: string;
  purpose: LocalizedText;
};
type ScriptLogic = { context: LocalizedText; proof: LocalizedText; check: LocalizedText };

const logic: Record<string, ScriptLogic> = {
  VIS: {
    context: ["Commuters park at shared racks where an external mount is visible.", "通勤者经常停在公共车架，外置支架在这个场景下容易被看到。"],
    proof: ["Start with an unmarked handlebar, then show the actual mounting location.", "先让观众找定位器，再拍清主机实际安装位置，用揭晓画面证明隐蔽安装。"],
    check: ["Show the actual installed position and verify the bar’s fit before filming.", "必须露出真实隐藏位置，拍摄前确认车把适配。"],
  },
  LOST: {
    context: ["A crowded rack makes it easy to forget which spot a commuter used.", "下班回到拥挤车架时，很容易忘记具体停车位置。"],
    proof: ["Demonstrate the last available location with a real recording from the paired phone.", "用已配对手机的真实录屏演示最近可用位置，说明可查看位置。"],
    check: ["Use an actual app recording and avoid promising recovery or live tracking.", "App 使用真实录屏，不承诺找回或实时追踪。"],
  },
  SUB: {
    context: ["Commuters considering an everyday accessory want to know about ongoing fees.", "通勤者考虑日常配件时，会关心后续是否要持续付费。"],
    proof: ["Answer the subscription question directly with one product-specific caption.", "用与产品绑定的一句字幕直接回应是否需要订阅。"],
    check: ["Confirm the subscription statement applies to this product and avoid competitor pricing.", "确认无订阅表述适用于此产品，不比较竞品价格。"],
  },
  INSTX: {
    context: ["Routine riders want to understand the installation effort before buying.", "日常骑行者希望买之前就知道安装过程有多复杂。"],
    proof: ["Show opening the end cap, inserting the tracker, and securing it as separate steps.", "分镜依次展示打开端盖、放入定位器、固定三个实际步骤。"],
    check: ["Verify each step against the real installation and avoid unverified time or fit claims.", "按真实安装流程拍摄，不使用未经确认的安装时长或适配范围。"],
  },
  ANDR: {
    context: ["An Android commuter needs to know which network works with their phone.", "用安卓手机的通勤者首先要确认自己的手机能接入哪个网络。"],
    proof: ["Show the Android setup and state that the rider chooses one network.", "展示安卓端设置，并说明两个网络需要二选一。"],
    check: ["Use real screen recordings, verify compatibility, and avoid exclusivity claims.", "使用真实录屏并确认兼容性，不宣称独有。"],
  },
  GIFTM: {
    context: ["A practical gift makes more sense when the recipient can use it on a daily commute.", "实用礼物要让收礼人看出它如何用在日常通勤里。"],
    proof: ["Go from unwrapping to the actual mounting position on the recipient’s bike.", "从拆礼物过渡到车把内安装，展示收礼人如何把礼物用起来。"],
    check: ["Show the concealed position and verify compatibility before filming.", "展示隐藏位置，拍摄前确认车把适配。"],
  },
};

const scenePurposes: LocalizedText[] = [
  ["Introduce the pain point", "交代痛点"],
  ["Show evidence for the main benefit", "给出主卖点的画面证据"],
  ["Invite the viewer to learn more", "引导观众了解更多"],
];

type Copy = readonly [german: string, chinese: string];
type CombinationValue = { code: string; label: LocalizedText };
export type CombinationElement = CombinationValue & { key: string; name: LocalizedText };
export type SampleStoryboard = { scenes: SampleScene[]; logic: ScriptLogic; language?: string };
export function sampleVisualPrompt(scene: SampleScene) {
  return scene.visualPrompt ?? `${scene.visual[0]} Vertical 9:16, natural light, realistic UGC.`;
}
export type SampleScript = {
  id: string;
  pain: LocalizedText;
  language?: string;
  combination: CombinationElement[];
  copy: { hook: Copy; body: Copy; cta: Copy };
};

function element(key: string, name: LocalizedText, code: string, label: LocalizedText): CombinationElement {
  return { key, name, code, label };
}

const setup = {
  market: ["Germany", "德国"] as LocalizedText,
  funnel: ["Awareness", "认知"] as LocalizedText,
  audience: ["Commuters", "通勤者"] as LocalizedText,
};
const common = [
  element("MKT", ["Market", "市场"], "DE", setup.market),
  element("FUN", ["Funnel", "漏斗"], "AW", setup.funnel),
  element("AUD", ["Audience", "人群"], "COMM", setup.audience),
];

type Variant = { opening: Copy; body: Copy };
const variants: Record<string, Variant> = {
  VIS: {
    opening: ["Auf diesem Rad ist ein Tracker. Du hast drei Sekunden: Findest du ihn?", "这辆车上装了定位器。给你三秒，你能找到吗？"],
    body: ["Drei, zwei, eins. Am Rahmen ist nichts zu sehen. Ich ziehe die Kappe am Lenker ab, und hier kommt der Findhoo 200 zum Vorschein. Der Tracker sitzt im passenden Lenker, und mit der Kappe sieht das Rad von außen aus wie vorher.", "三、二、一。车架上什么都看不到。我打开车把端盖，Findhoo 200 就在里面。把它装进适配的车把，再盖回端盖，车子外观看起来跟原来一样。"],
  },
  LOST: {
    opening: ["Ich war nur kurz Kaffee holen. Wo genau steht mein Rad?", "我只是去买了杯咖啡。自行车到底停在哪儿了？"],
    body: ["Vor dem Café stehen mehrere Räder nebeneinander. Auf meinem gekoppelten Handy öffne ich den Eintrag für meinen Findhoo 200. Dort sehe ich den zuletzt verfügbaren Standort. In dieser Situation hilft mir der Punkt, mich am Fahrradständer zu orientieren.", "咖啡店外并排停了好几辆车。我在已配对的手机上打开 Findhoo 200 的物品页面，看一眼最近可用的位置。这次，我可以用那个位置判断该往哪排车架找。"],
  },
  SUB: {
    opening: ["Meine Checkliste für den Arbeitsweg: Helm, Schloss – und braucht der Tracker ein Abo?", "通勤清单：头盔、车锁，还有一项，定位器需要订阅吗？"],
    body: ["Wenn ich morgens losfahre, möchte ich wissen, was bei meinem Zubehör dazugehört. Beim Findhoo 200 ist die Antwort einfach: Für die Nutzung des Trackers brauche ich kein Abo. Das ist der Punkt, den ich vor dem Kauf wissen wollte.", "早上出门骑车前，我想知道日常配件都有哪些使用条件。Findhoo 200 的这一点很直接：使用这个定位器无需订阅。这就是我买之前最想确认的事。"],
  },
  INSTX: {
    opening: ["Heute packe ich meinen neuen Tracker aus. Wie kommt er eigentlich in den Lenker?", "今天拆一个新定位器。它到底怎么装进车把？"],
    body: ["Ich prüfe zuerst, ob mein Lenker passt. Dann öffne ich die Endkappe, setze den Findhoo 200 ein und befestige ihn wie vorgesehen. Die Kappe kommt wieder drauf. So sieht die Installation an meinem Rad aus.", "我先检查车把是否适配，再打开端盖，放入 Findhoo 200，按说明固定，最后把端盖盖回去。这就是在我这辆车上的安装过程。"],
  },
  ANDR: {
    opening: ["Android auf dem Handy? Dann prüf diese Einstellung zuerst.", "手机用的是安卓？先检查这项设置。"],
    body: ["Beim Findhoo 200 wähle ich vor der Kopplung das Netzwerk, das zu meinem kompatiblen Handy passt. Für mein Android-Handy nehme ich die Android-Option. Für ein kompatibles iPhone gibt es die Apple-Option. Ich wähle eines von beiden.", "给 Findhoo 200 配对前，我先选和自己的兼容手机对应的网络。我用安卓，就选安卓选项；如果用兼容的 iPhone，就选 Apple 选项。两者二选一。"],
  },
  GIFTM: {
    opening: ["Was schenkt man jemandem, der jeden Tag mit dem Rad zur Arbeit fährt?", "每天骑车上班的人，会用得上什么礼物？"],
    body: ["In der kleinen Box ist ein Findhoo 200. Wir prüfen seinen Lenker und setzen den Tracker hinein. Als die Kappe wieder drauf ist, bleibt außen nichts zusätzlich am Rad hängen. Beim nächsten Arbeitsweg ist das Geschenk dabei, ohne außen Platz zu brauchen.", "小盒子里是 Findhoo 200。我们先确认车把适配，再把定位器装进去。盖回端盖后，车上没有多出来的外挂配件。下次骑车上班，这件礼物就能带上，也不占车把外侧的位置。"],
  },
};

function script(code: string, pain: LocalizedText, scenes: readonly (readonly [string, string, string, string?])[]): {
  script: SampleScript; storyboard: SampleStoryboard;
} {
  const variant = variants[code];
  const times = scenes.length === 5 ? ["0–3s", "3–8s", "8–15s", "15–23s", "23–30s"] : ["0–3s", "3–23s", "23–30s"];
  return {
    script: {
      id: `DE-AW-COMM-${code}-01`,
      pain,
      copy: { hook: variant.opening, body: variant.body, cta: ["Mehr über den Findhoo 200 erfahren.", "了解更多 Findhoo 200。"] },
      combination: [
        ...common,
        element("PAIN", ["Pain point", "痛点"], code, pain),
      ],
    },
    storyboard: {
      logic: logic[code],
      scenes: scenes.map(([en, zh, voiceover, translation = "了解更多。"], index) => ({
        time: times[index], visual: [en, zh], voiceover, translation,
        purpose: scenePurposes[index === 0 ? 0 : index === scenes.length - 1 ? 2 : 1],
      })),
    },
  };
}

const entries = [
    script("VIS", ["An external tracker is easy to spot", "外挂容易被发现"], [
      ["Sweep across the bike cockpit at the office rack.", "在办公楼车架旁扫过车把。", variants.VIS.opening[0], variants.VIS.opening[1]],
      ["After the three-second countdown, reveal the Findhoo 200 inside the handlebar and replace the cap.", "三秒倒计时后露出车把内的 Findhoo 200，再盖回端盖。", "Der Findhoo 200 sitzt im Lenker.", "Findhoo 200 装在车把里。"],
      ["Show the closed handlebar and end card.", "展示复原后的车把和结尾卡。", "Mehr erfahren."],
    ]),
    script("LOST", ["Hard to locate a parked bike", "停车后难找或担心丢车"], [
      ["Show the commuter returning to the crowded rack outside a café.", "通勤者回到咖啡店外停满车的车架旁。", "Wo habe ich mein Rad abgestellt?", "我的车停在哪儿了？"],
      ["Show the last available location on the paired phone, then walk toward the rack.", "展示已配对手机里的最近可用位置，再走向车架。", "Hier sehe ich den letzten verfügbaren Standort.", "这里能看到最近可用的位置。"],
      ["Cut to the bike and the product end card.", "切回自行车和产品结尾卡。", "Mehr erfahren."],
    ]),
    script("SUB", ["Avoiding a subscription", "不想付订阅"], [
      ["Hold the tracker beside a commuter helmet.", "把定位器放在通勤头盔旁。", "Brauche ich dafür ein Abo?", "这个需要订阅吗？"],
      ["Show the product and the paired phone’s item screen, with an on-screen no-subscription label.", "展示产品和已配对手机的物品页面，字幕注明无需订阅。", "Für den Findhoo 200 brauche ich kein Abo.", "使用 Findhoo 200 无需订阅。"],
      ["End on the product and the learn-more cue.", "用产品特写和「了解更多」收尾。", "Mehr erfahren."],
    ]),
    script("INSTX", ["Worried about difficult installation", "怕安装麻烦"], [
      ["Frame the compatible handlebar opening and the tracker.", "拍摄适配的车把开口和定位器。", "Wie kommt der Tracker in den Lenker?", "怎么把定位器装进车把？"],
      ["Close-up of opening the end cap.", "特写打开端盖。", "Zuerst die Kappe öffnen.", "先打开端盖。"],
      ["Show the tracker being inserted into the handlebar.", "拍摄将定位器放入车把。", "Dann den Tracker einsetzen.", "然后放入定位器。"],
      ["Show the tracker secured and the end cap back in place.", "展示定位器固定后复原端盖。", "Zum Schluss befestigen und die Kappe schließen.", "最后固定定位器并盖回端盖。"],
      ["Show the installed view and end card.", "展示装好后的画面和结尾卡。", "Mehr erfahren."],
    ]),
    script("ANDR", ["Android riders cannot use Apple Find My", "安卓用户用不了 Find My"], [
      ["Place the rider’s Android phone next to the tracker.", "将通勤者的安卓手机放在定位器旁。", "Und wenn ich Android nutze?", "如果我用安卓手机呢？"],
      ["Show the compatible Android setup. Use a caption to clarify that you choose one network.", "展示适配的安卓设置，字幕写明两个网络二选一。", "Du wählst das passende Netzwerk: für Android oder für Apple. Immer nur eines.", "选择适合安卓或 Apple 的网络，两者二选一。"],
      ["End on a compatibility cue and the product.", "用兼容性提示和产品画面收尾。", "Mehr erfahren."],
    ]),
    script("GIFTM", ["Looking for a practical gift", "想送实用礼物"], [
      ["A commuter unwraps the tracker next to their bike.", "通勤者在车旁拆开定位器礼物。", "Ein praktisches Geschenk fürs Pendeln?", "想送一份通勤时能用上的礼物？"],
      ["Show the recipient placing it inside a compatible handlebar; hold on the installed position.", "拍下收礼人把定位器装进适配车把，并停留展示隐藏位置。", "Der Findhoo 200 sitzt unauffällig im Lenker.", "Findhoo 200 藏在车把里。"],
      ["Show the recipient leaving for their commute and close on the end card.", "展示收礼人骑车出发，再切到结尾卡。", "Mehr erfahren."],
    ]),
];

export const sampleScriptBatch = {
  id: "DEMO-001",
  createdAt: "2026-11-20T16:00:00Z",
  scripts: entries.map(entry => entry.script),
};

export const sampleStoryboards = new Map(entries.map(entry => [entry.script.id, entry.storyboard]));
