// brand.js: MattoLAB 푸터를 그리는 함수. **이 파일이 원본이다.**
// 각 사이트의 assets/brand/ 로 sync.mjs가 복사한다. 사이트 쪽 사본을 직접 고치지 말 것:
// 다음 sync 때 덮인다. 고칠 곳은 여기 하나다.
//
// 브랜드 규칙(BRAND.md): Sora · Matto=Medium(500)/Ink · LAB=ExtraBold(800)/Signal Coral.
// **코랄은 LAB과 "지금 보고 있는 제품"에만.**
import { PRODUCTS, LAB_TAGLINE, CONTACT } from "./products.js?v=663d2a871e";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// 제품 한 칸. 지금 보고 있는 것은 코랄로 두고 링크를 걸지 않는다(자기 자신으로 가는 링크).
const product = (p, siteName) => {
  const self = p.name === siteName;
  const title = self ? `<b class="on">${esc(p.name)}</b>`
                     : `<b><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a></b>`;
  return `<span class="lab-p">${title}<em>${esc(p.desc)}</em></span>`;
};

// 연락처 한 줄. 값이 없으면 링크 대신 "준비 중이에요"를 옅게 둔다.
// 이름과 값은 칸 간격으로만 나눈다. 긴 줄표는 쓰지 않는다: 독자 화면 글에 줄표를 쓰지 않는 규칙(2026-10-21).
const row = (key, value, href) => {
  const k = `<span class="k">${esc(key)}</span>`;
  if (!value) return k + `<span class="soon">준비 중이에요</span>`;
  return k + (href ? `<a href="${esc(href)}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(value)}</a>`
                   : `<span>${esc(value)}</span>`);
};

// 저작권 한 줄. labBlock과 labLine이 같이 쓴다.
const COPY = "© 2026 Matto · 글·그림·코드의 무단 복제·배포와 AI 학습 이용을 금합니다.";

// 한 줄 띠의 제품 이름 하나. 지금 보고 있는 것은 코랄, 링크 없음(product와 같은 규칙).
const lineProduct = (p, siteName) => p.name === siteName
  ? `<b class="on" title="${esc(p.desc)}">${esc(p.name)}</b>`
  : `<a href="${esc(p.url)}" title="${esc(p.desc)}" target="_blank" rel="noopener">${esc(p.name)}</a>`;

// 한 줄 띠의 연락처. 이름표 없이 값만 늘어놓으므로 인디스쿨만 「인디스쿨」을 앞에 붙인다(이름만으로는 무엇인지 모른다). 값이 없는 것은 뺀다.
const lineContact = () => [
  CONTACT.email && `<a href="mailto:${esc(CONTACT.email)}">${esc(CONTACT.email)}</a>`,
  CONTACT.instagram && `<a href="https://instagram.com/${esc(CONTACT.instagram)}" target="_blank" rel="noopener">@${esc(CONTACT.instagram)}</a>`,
  CONTACT.indischool && `<span>인디스쿨 ${esc(CONTACT.indischool)}</span>`,
  CONTACT.website && `<a href="${esc(CONTACT.website)}" target="_blank" rel="noopener">${esc(CONTACT.website.replace(/^https?:\/\/|\/$/g, ""))}</a>`,
].filter(Boolean).join("");

// 푸터 알맹이. 사이트마다 감싸는 방식이 달라 태그와 조회수 자리를 옵션으로 받는다.
//   siteName  이 사이트 이름. products.js의 name과 글자까지 같아야 "지금 보고 있는 제품"을
//             알아내 코랄로 칠하고 자기 자신으로 가는 링크를 뺀다.
//   tag       "footer"(이게 곧 푸터) 또는 "div"(바깥에 이미 <footer>가 있는 사이트)
//   withViews 조회수 자리를 둘지. 조회수를 세지 않는 화면은 false.
//
// 왼쪽에 브랜드와 제품 격자, 오른쪽에 Contact 한 열과 조회수.
// 제품 격자는 2행을 유지한 채 **오른쪽으로** 자란다(6개면 3열, 12개면 6열).
export const labBlock = (siteName, { tag = "footer", withViews = true } = {}) => `<${tag} class="lab">
      <div class="lab-l">
        <div class="brandline">
          <span class="labmark"><i>Matto</i><b>LAB</b></span>
          <em>${esc(LAB_TAGLINE)}</em>
        </div>
        <div class="prod">${PRODUCTS.map((p) => product(p, siteName)).join("")}</div>
      </div>
      <div class="lab-r">
        <span class="lab-label">Contact</span>
        <div class="cx">
          ${row("Email", CONTACT.email, `mailto:${CONTACT.email}`)}
          ${row("Instagram", CONTACT.instagram && `@${CONTACT.instagram}`, CONTACT.instagram && `https://instagram.com/${CONTACT.instagram}`)}
          ${row("Indischool", CONTACT.indischool, null)}
          ${row("Website", CONTACT.website && CONTACT.website.replace(/^https?:\/\/|\/$/g, ""), CONTACT.website)}
        </div>
        ${withViews ? `<p class="views" hidden></p>` : ""}
      </div>
      <p class="lab-copy">${COPY}</p>
    </${tag}>`;

// 한 줄 띠. 바닥글이 화면을 많이 차지하면 안 되는 곳에 쓴다(2026-10-22 MattoLAND 홈: labBlock이 폰에서 516px, 화면 반을 넘었다).
// labBlock과 같은 내용(제품·연락처·저작권)에서 제품 설명 줄과 Contact 이름표만 뺀다. 설명은 제품 이름에 손을 올리면 뜬다(title).
// 넓으면 [MattoLAB · 한 줄 소개] [제품 이름들] [연락처] 한 줄, 그 아래 저작권. 760px 아래는 위아래로 쌓는다.
// 조회수 자리는 없다.
export const labLine = (siteName, { tag = "footer" } = {}) => `<${tag} class="lab lab-line">
      <div class="ll-brand"><span class="labmark"><i>Matto</i><b>LAB</b></span><em>${esc(LAB_TAGLINE)}</em></div>
      <div class="ll-prod">${PRODUCTS.map((p) => lineProduct(p, siteName)).join("")}</div>
      <div class="ll-cx">${lineContact()}</div>
      <p class="lab-copy">${COPY}</p>
    </${tag}>`;
