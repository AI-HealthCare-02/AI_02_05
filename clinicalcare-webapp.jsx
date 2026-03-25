import { useState, useRef, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════════════════════
const SYMPTOMS = [
  { id: 1, name: "두통", body: "머리", cat: "통증" },
  { id: 2, name: "발열", body: "전신", cat: "전신증상" },
  { id: 3, name: "기침", body: "호흡기", cat: "호흡기" },
  { id: 4, name: "콧물", body: "호흡기", cat: "호흡기" },
  { id: 5, name: "인후통", body: "호흡기", cat: "호흡기" },
  { id: 6, name: "근육통", body: "전신", cat: "통증" },
  { id: 7, name: "피로감", body: "전신", cat: "전신증상" },
  { id: 8, name: "복통", body: "소화기", cat: "소화기" },
  { id: 9, name: "설사", body: "소화기", cat: "소화기" },
  { id: 10, name: "구토", body: "소화기", cat: "소화기" },
  { id: 11, name: "어지러움", body: "머리", cat: "신경" },
  { id: 12, name: "관절통", body: "근골격", cat: "통증" },
  { id: 13, name: "피부발진", body: "피부", cat: "피부" },
  { id: 14, name: "가려움", body: "피부", cat: "피부" },
  { id: 15, name: "호흡곤란", body: "호흡기", cat: "호흡기" },
  { id: 16, name: "소화불량", body: "소화기", cat: "소화기" },
  { id: 17, name: "불면증", body: "전신", cat: "신경" },
  { id: 18, name: "코막힘", body: "호흡기", cat: "호흡기" },
  { id: 19, name: "재채기", body: "호흡기", cat: "호흡기" },
  { id: 20, name: "가슴통증", body: "흉부", cat: "통증" },
];

const DISEASES = {
  "감기": { sym: [2,3,4,5,18,19], sev: "경증" },
  "독감": { sym: [2,3,5,6,7], sev: "중등증" },
  "편두통": { sym: [1,11,10], sev: "중등증" },
  "급성위장염": { sym: [8,9,10,2], sev: "중등증" },
  "알레르기성 비염": { sym: [4,18,19,14], sev: "경증" },
  "근골격계 질환": { sym: [6,12,7], sev: "경증" },
  "접촉성 피부염": { sym: [13,14], sev: "경증" },
  "과민성 대장증후군": { sym: [8,9,16], sev: "중등증" },
};

const MEDS = {
  "감기": [
    { name: "타이레놀 (아세트아미노펜)", dose: "1회 1~2정, 4~6시간 간격", time: "식후", warn: "1일 8정 초과 금지. 간 질환자 주의", cls: "해열진통제" },
    { name: "판콜에이", dose: "1회 1정, 1일 3회", time: "식후 30분", warn: "졸음 유발 가능", cls: "종합감기약" },
  ],
  "독감": [
    { name: "타이레놀", dose: "1회 1~2정, 4~6시간 간격", time: "식후", warn: "1일 8정 초과 금지", cls: "해열진통제" },
    { name: "이부프로펜", dose: "1회 200mg, 1일 3회", time: "식후 즉시", warn: "위장장애 주의. 공복 복용 금지", cls: "소염진통제" },
  ],
  "편두통": [
    { name: "이부프로펜", dose: "1회 200~400mg", time: "증상 시작 시", warn: "위장장애 주의", cls: "소염진통제" },
    { name: "아세트아미노펜", dose: "1회 500~1000mg", time: "증상 시작 시", warn: "간 질환자 주의", cls: "해열진통제" },
  ],
  "급성위장염": [
    { name: "스멕타", dose: "1회 1포, 1일 3회", time: "식간", warn: "다른 약물과 2시간 간격", cls: "지사제" },
    { name: "정로환", dose: "1회 3정, 1일 3회", time: "식간", warn: "장기 복용 시 의사 상담", cls: "정장제" },
  ],
  "알레르기성 비염": [
    { name: "세티리진", dose: "1회 10mg, 1일 1회", time: "취침 전", warn: "졸음 유발 가능", cls: "항히스타민제" },
    { name: "로라타딘", dose: "1회 10mg, 1일 1회", time: "아무 때나", warn: "비교적 졸음 적음", cls: "항히스타민제" },
  ],
};

const LIFESTYLE = {
  "감기": {
    diet: ["따뜻한 물/차 자주 마시기 (하루 2L 이상)", "비타민 C 풍부한 과일 섭취 (귤, 키위)", "단백질 충분히 섭취 (닭가슴살, 계란)", "맵고 자극적인 음식 피하기"],
    exercise: ["무리한 운동 삼가기", "가벼운 스트레칭 정도만", "회복 후 점진적으로 운동량 늘리기"],
    sleep: ["하루 8시간 이상 충분한 수면", "환기 후 적절한 실내 습도(40~60%) 유지", "베개를 높여 코막힘 완화"],
  },
  "독감": {
    diet: ["수분 보충이 최우선 (물, 이온음료)", "소화 잘 되는 음식 (죽, 미음)", "비타민 C, 아연 보충제 고려"],
    exercise: ["발열 시 절대 안정", "해열 후 48시간까지 안정", "회복기에 걷기부터 시작"],
    sleep: ["격리 환경에서 충분한 수면", "실내 온도 20~22°C 유지", "습도 50~60% 유지"],
  },
  "편두통": {
    diet: ["카페인 과다 섭취 피하기", "규칙적인 식사 (공복 피하기)", "치즈, 초콜릿, 와인 등 트리거 식품 주의", "마그네슘 풍부한 음식 (견과류, 시금치)"],
    exercise: ["규칙적인 유산소 운동 (주 3~5회, 30분)", "요가/명상으로 스트레스 관리", "갑작스러운 고강도 운동 피하기"],
    sleep: ["매일 같은 시간 취침/기상", "7~8시간 수면 유지", "어둡고 조용한 수면 환경"],
  },
  "급성위장염": {
    diet: ["수분 충분히 보충 (전해질 음료)", "소화 쉬운 음식부터 시작 (죽, 바나나)", "유제품, 기름진 음식 피하기"],
    exercise: ["증상 있을 때 충분한 안정", "탈수 주의하며 가벼운 활동만", "증상 호전 후 산책부터 시작"],
    sleep: ["충분한 휴식이 회복의 핵심", "옆으로 누워 복부 부담 줄이기"],
  },
  "알레르기성 비염": {
    diet: ["항염 식품 섭취 (오메가3, 녹차)", "유제품 줄이기 (점액 증가 가능)", "프로바이오틱스 섭취 고려"],
    exercise: ["실내 운동 권장 (꽃가루 시즌)", "운동 전 항히스타민제 복용", "수영은 피하기 (염소 자극)"],
    sleep: ["침구류 주 1회 열수 세탁", "공기청정기 가동", "창문 닫고 취침"],
  },
};

const DRUG_INTER = [
  { a: "아세트아미노펜", b: "알코올", sev: "심각", desc: "간 손상 위험이 크게 증가합니다" },
  { a: "아세트아미노펜", b: "와파린", sev: "중등", desc: "출혈 위험이 증가할 수 있습니다" },
  { a: "이부프로펜", b: "아스피린", sev: "중등", desc: "아스피린의 항혈소판 효과를 감소시킬 수 있습니다" },
  { a: "이부프로펜", b: "알코올", sev: "중등", desc: "위장 출혈 위험이 증가합니다" },
  { a: "세티리진", b: "알코올", sev: "경고", desc: "졸음이 심해질 수 있습니다" },
  { a: "이부프로펜", b: "리튬", sev: "심각", desc: "리튬 독성 위험이 증가합니다" },
  { a: "아세트아미노펜", b: "이소니아지드", sev: "심각", desc: "간독성 위험이 크게 증가합니다" },
  { a: "로라타딘", b: "에리스로마이신", sev: "경고", desc: "로라타딘 혈중 농도가 증가할 수 있습니다" },
];

const ALL_DRUGS = ["아세트아미노펜","이부프로펜","아스피린","세티리진","로라타딘","알코올","와파린","에리스로마이신","리튬","이소니아지드","오메프라졸","메트포르민","암로디핀","덱스트로메토르판"];

// ═══════════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════════
const T = {
  bg: "#F8F9FB", card: "#FFFFFF", primary: "#2563EB", primaryLight: "#EFF6FF",
  accent: "#10B981", accentLight: "#ECFDF5",
  danger: "#EF4444", dangerLight: "#FEF2F2",
  warn: "#F59E0B", warnLight: "#FFFBEB",
  text: "#0F172A", textSec: "#64748B", textTer: "#94A3B8",
  border: "#E2E8F0", borderLight: "#F1F5F9",
  radius: 14, radiusSm: 8,
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.06)",
};

const fontUrl = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

// ═══════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════
const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: T.card, borderRadius: T.radius, border: `1px solid ${T.border}`, padding: 16, ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, disabled, variant = "primary", full, style }) => {
  const styles = {
    primary: { bg: T.primary, color: "#fff" },
    ghost: { bg: "transparent", color: T.primary },
    danger: { bg: T.dangerLight, color: T.danger },
    outline: { bg: "#fff", color: T.text },
  };
  const s = styles[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? "100%" : "auto", padding: "12px 20px", borderRadius: T.radiusSm, border: variant === "outline" ? `1px solid ${T.border}` : "none",
      background: disabled ? T.border : s.bg, color: disabled ? T.textTer : s.color,
      fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer", transition: "all .15s", ...style,
    }}>{children}</button>
  );
};

const Chip = ({ label, active, onClick, removable }) => (
  <button onClick={onClick} style={{
    padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", transition: "all .15s", display: "inline-flex", alignItems: "center", gap: 4,
    border: active ? `1.5px solid ${T.primary}` : `1px solid ${T.border}`,
    background: active ? T.primaryLight : "#fff",
    color: active ? T.primary : T.textSec, fontWeight: active ? 600 : 400,
  }}>{label}{removable && <span style={{ fontSize: 11, opacity: .6 }}> ✕</span>}</button>
);

const Badge = ({ label, color }) => {
  const c = color === "green" ? T.accent : color === "red" ? T.danger : color === "yellow" ? T.warn : T.primary;
  return <span style={{ fontSize: 11, fontWeight: 600, color: c, background: c + "18", padding: "2px 8px", borderRadius: 10 }}>{label}</span>;
};

const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", background: T.borderLight, borderRadius: 10, padding: 3, gap: 2 }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
        background: active === t.id ? "#fff" : "transparent", boxShadow: active === t.id ? T.shadow : "none",
        fontWeight: active === t.id ? 600 : 400, color: active === t.id ? T.text : T.textSec, transition: "all .2s",
      }}>{t.icon} {t.label}</button>
    ))}
  </div>
);

const Disclaimer = () => (
  <div style={{ margin: "16px 0 0", padding: "10px 14px", background: T.warnLight, borderRadius: T.radiusSm, fontSize: 11, color: "#92400E", lineHeight: 1.5, textAlign: "center" }}>
    ⚠️ 본 서비스는 의료 행위를 대체하지 않습니다. 정확한 진단과 처방은 반드시 의료 전문가와 상담하세요.
  </div>
);

const BottomNav = ({ active, onChange, hasChat }) => {
  const items = [
    { id: "home", icon: "🏠", label: "홈" },
    { id: "history", icon: "📋", label: "기록" },
    { id: "chat", icon: "💬", label: "AI상담" },
    { id: "my", icon: "👤", label: "마이" },
  ];
  return (
    <div style={{ display: "flex", borderTop: `1px solid ${T.border}`, background: "#fff", padding: "6px 0 2px" }}>
      {items.map(i => (
        <button key={i.id} onClick={() => onChange(i.id)} style={{
          flex: 1, border: "none", background: "none", cursor: "pointer", padding: "4px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          color: active === i.id ? T.primary : T.textTer, fontSize: 10, fontWeight: active === i.id ? 600 : 400,
        }}>
          <span style={{ fontSize: 18 }}>{i.icon}</span>{i.label}
          {i.id === "chat" && hasChat && <span style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: T.danger, marginTop: -14, marginLeft: 12 }}/>}
        </button>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// SCR-001: ONBOARDING
// ═══════════════════════════════════════════════════════════
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const slides = [
    { emoji: "🔍", title: "증상을 입력하면\nAI가 분석해드려요", desc: "체크리스트로 간편하게 증상을 입력하고\n가능한 질환과 복약 안내를 받아보세요" },
    { emoji: "🌿", title: "맞춤 생활습관으로\n건강을 관리하세요", desc: "질환에 맞는 식단, 운동, 수면 가이드를\n개인화된 추천으로 제공합니다" },
    { emoji: "💊", title: "약물 상호작용도\n간편하게 체크", desc: "복용 중인 약물의 상호작용을 확인하고\nAI 상담사에게 건강 질문을 해보세요" },
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 32, textAlign: "center", position: "relative" }}>
      <button onClick={onDone} style={{ position: "absolute", top: 16, right: 16, border: "none", background: "none", color: T.textTer, fontSize: 14, cursor: "pointer" }}>건너뛰기</button>
      <div style={{ fontSize: 72, marginBottom: 24 }}>{slides[step].emoji}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.text, lineHeight: 1.4, whiteSpace: "pre-line", marginBottom: 12 }}>{slides[step].title}</div>
      <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.7, whiteSpace: "pre-line", marginBottom: 32 }}>{slides[step].desc}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? T.primary : T.border, transition: "all .3s" }}/>)}
      </div>
      <Btn full onClick={() => step < 2 ? setStep(step + 1) : onDone()}>{step < 2 ? "다음" : "시작하기"}</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-002: LOGIN
// ═══════════════════════════════════════════════════════════
function Login({ onLogin }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 32 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${T.primary}, #7C3AED)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>C</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 4 }}>ClinicalCare</div>
      <div style={{ fontSize: 13, color: T.textSec, marginBottom: 40 }}>AI 기반 건강 관리 서비스</div>
      <button onClick={() => onLogin(true)} style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: "#FEE500", color: "#191919", fontSize: 15, fontWeight: 600, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        💬 카카오로 시작하기
      </button>
      <button onClick={() => onLogin(true)} style={{ width: "100%", padding: 14, borderRadius: 10, border: "none", background: "#03C75A", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        🟢 네이버로 시작하기
      </button>
      <div style={{ marginTop: 24, fontSize: 11, color: T.textTer, textAlign: "center" }}>
        시작하면 <span style={{ textDecoration: "underline", cursor: "pointer" }}>이용약관</span> 및 <span style={{ textDecoration: "underline", cursor: "pointer" }}>개인정보처리방침</span>에 동의합니다
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-003: HEALTH PROFILE
// ═══════════════════════════════════════════════════════════
function ProfileSetup({ onDone, profile, setProfile }) {
  const [step, setStep] = useState(1);
  const conditions = ["고혈압","당뇨","심장질환","천식","간질환","신장질환","갑상선질환"];
  const allergies = ["페니실린","아스피린","설파제","이부프로펜","해산물","땅콩"];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        {step > 1 && <button onClick={() => setStep(step-1)} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer", marginRight: 8 }}>←</button>}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: T.textSec }}>건강 프로필 등록</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Step {step}/3</div>
        </div>
        <button onClick={onDone} style={{ border: "none", background: "none", color: T.textTer, fontSize: 13, cursor: "pointer" }}>나중에</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? T.primary : T.border, transition: "all .3s" }}/>)}
      </div>

      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: T.text }}>나이 *</label>
          <input type="number" value={profile.age || ""} onChange={e => setProfile({...profile, age: e.target.value})} placeholder="나이를 입력하세요" style={{ padding: 12, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, outline: "none" }}/>
          <label style={{ fontSize: 13, fontWeight: 600, color: T.text }}>성별 *</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["남성","여성","기타"].map(g => <Chip key={g} label={g} active={profile.gender === g} onClick={() => setProfile({...profile, gender: g})}/>)}
          </div>
          <label style={{ fontSize: 13, fontWeight: 600, color: T.text }}>키 (cm)</label>
          <input type="number" value={profile.height || ""} onChange={e => setProfile({...profile, height: e.target.value})} placeholder="175.0" style={{ padding: 12, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, outline: "none" }}/>
          <label style={{ fontSize: 13, fontWeight: 600, color: T.text }}>체중 (kg)</label>
          <input type="number" value={profile.weight || ""} onChange={e => setProfile({...profile, weight: e.target.value})} placeholder="70.0" style={{ padding: 12, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, outline: "none" }}/>
        </div>
      )}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 8 }}>기저질환 (해당 항목 선택)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {conditions.map(c => <Chip key={c} label={c} active={(profile.conditions||[]).includes(c)} onClick={() => {
                const cur = profile.conditions || [];
                setProfile({...profile, conditions: cur.includes(c) ? cur.filter(x=>x!==c) : [...cur, c]});
              }}/>)}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 8 }}>알레르기 (해당 항목 선택)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allergies.map(a => <Chip key={a} label={a} active={(profile.allergies||[]).includes(a)} onClick={() => {
                const cur = profile.allergies || [];
                setProfile({...profile, allergies: cur.includes(a) ? cur.filter(x=>x!==a) : [...cur, a]});
              }}/>)}
            </div>
          </div>
        </div>
      )}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>프로필 요약</div>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.8 }}>
              {profile.age && <div>나이: {profile.age}세</div>}
              {profile.gender && <div>성별: {profile.gender}</div>}
              {profile.height && <div>키: {profile.height}cm</div>}
              {profile.weight && <div>체중: {profile.weight}kg</div>}
              {profile.conditions?.length > 0 && <div>기저질환: {profile.conditions.join(", ")}</div>}
              {profile.allergies?.length > 0 && <div>알레르기: {profile.allergies.join(", ")}</div>}
              {!profile.age && !profile.gender && <div style={{ color: T.textTer }}>입력된 정보가 없습니다</div>}
            </div>
          </Card>
        </div>
      )}
      <div style={{ marginTop: 24 }}>
        <Btn full onClick={() => step < 3 ? setStep(step+1) : onDone()}>
          {step < 3 ? "다음" : "완료"}
        </Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-004: HOME
// ═══════════════════════════════════════════════════════════
function Home({ onNav, profile, lastResult, lifestyleScore }) {
  const features = [
    { id: "symptom", icon: "🔍", title: "증상 체크", desc: "증상 분석 + 복약", color: "#3B82F6" },
    { id: "lifestyle", icon: "🌿", title: "생활습관", desc: "맞춤 추천 + 기록", color: "#10B981" },
    { id: "drug", icon: "💊", title: "약물 체크", desc: "상호작용 검사", color: "#F59E0B" },
    { id: "chat", icon: "💬", title: "AI 상담", desc: "건강 질문 상담", color: "#8B5CF6" },
  ];
  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: T.textSec }}>안녕하세요 👋</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{profile.age ? `${profile.age}세 ${profile.gender || ""}` : "건강한 하루 되세요"}</div>
      </div>

      {(lastResult || lifestyleScore != null) && (
        <Card style={{ marginBottom: 16, cursor: "pointer", background: T.primaryLight, border: `1px solid ${T.primary}22` }} onClick={() => onNav("history")}>
          <div style={{ fontSize: 12, color: T.primary, fontWeight: 600, marginBottom: 6 }}>최근 건강 요약</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {lastResult && <div style={{ fontSize: 13, color: T.text }}>최근 분석: <b>{lastResult}</b></div>}
            {lifestyleScore != null && <div style={{ fontSize: 13, color: T.accent }}>생활습관 점수: <b>{lifestyleScore}점</b></div>}
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {features.map(f => (
          <Card key={f.id} onClick={() => onNav(f.id)} style={{ cursor: "pointer", transition: "transform .15s" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{f.title}</div>
            <div style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>{f.desc}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 16, cursor: "pointer" }} onClick={() => onNav("report")}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>📊</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>건강 리포트</div>
            <div style={{ fontSize: 12, color: T.textSec }}>주간/월간 건강 데이터 종합 리포트 생성</div>
          </div>
          <span style={{ marginLeft: "auto", color: T.textTer }}>→</span>
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-005 + SCR-006: SYMPTOM CHECKER + RESULTS
// ═══════════════════════════════════════════════════════════
function SymptomChecker({ onBack, onResult, onNavLifestyle, onNavChat }) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [collapsedCats, setCollapsedCats] = useState({});

  const cats = [...new Set(SYMPTOMS.map(s => s.cat))];
  const filtered = search ? SYMPTOMS.filter(s => s.name.includes(search)) : SYMPTOMS;
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  const toggleCat = c => setCollapsedCats(p => ({...p, [c]: !p[c]}));

  const analyze = () => {
    const scored = Object.entries(DISEASES).map(([name, d]) => {
      const matched = d.sym.filter(id => selected.includes(id));
      return { name, ...d, prob: Math.round((matched.length / d.sym.length) * 100), matched: matched.length };
    }).filter(d => d.prob > 0).sort((a, b) => b.prob - a.prob).slice(0, 5);
    setResults(scored);
    if (scored.length > 0) onResult(scored[0].name);
  };

  if (results) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <button onClick={() => setResults(null)} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>←</button>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>분석 결과</div>
        </div>
        <div style={{ fontSize: 12, color: T.textSec, marginBottom: 16 }}>선택 증상 {selected.length}개 · {new Date().toLocaleString("ko-KR")}</div>

        {results.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 32 }}><div style={{ color: T.textTer }}>매칭되는 질환이 없습니다</div></Card>
        ) : results.map((d, i) => (
          <Card key={d.name} style={{ marginBottom: 10, cursor: "pointer" }} onClick={() => setExpanded(expanded === d.name ? null : d.name)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: i === 0 ? T.primary : T.textTer, color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{i+1}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: T.text }}>{d.name}</div>
                  <Badge label={d.sev} color={d.sev === "경증" ? "green" : "yellow"}/>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? T.primary : T.textSec }}>{d.prob}%</div>
                <div style={{ fontSize: 11, color: T.textTer }}>일치율</div>
              </div>
            </div>
            {expanded === d.name && MEDS[d.name] && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.borderLight}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>💊 복약 안내</div>
                {MEDS[d.name].map((m, j) => (
                  <div key={j} style={{ background: T.borderLight, borderRadius: 8, padding: 10, marginBottom: 8, borderLeft: `3px solid ${T.primary}` }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: T.textSec, marginTop: 4 }}>용법: {m.dose} · 복용: {m.time}</div>
                    <div style={{ fontSize: 11, color: T.danger, marginTop: 4, background: T.dangerLight, padding: "4px 8px", borderRadius: 4 }}>⚠ {m.warn}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn full variant="outline" onClick={() => onNavLifestyle()}>🌿 생활습관 추천</Btn>
          <Btn full onClick={() => onNavChat()}>💬 AI 상담하기</Btn>
        </div>
        <Btn full variant="ghost" onClick={() => { setResults(null); setSelected([]); }} style={{ marginTop: 8 }}>다시 분석하기</Btn>
        <Disclaimer/>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>증상 체크</div>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="증상을 검색하세요..." style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, outline: "none", marginBottom: 12, boxSizing: "border-box" }}/>
      <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 12 }}>
        {cats.map(cat => {
          const items = filtered.filter(s => s.cat === cat);
          if (!items.length) return null;
          return (
            <div key={cat} style={{ marginBottom: 10 }}>
              <div onClick={() => toggleCat(cat)} style={{ fontSize: 11, fontWeight: 600, color: T.textTer, textTransform: "uppercase", marginBottom: 6, letterSpacing: .5, cursor: "pointer" }}>
                {collapsedCats[cat] ? "▸" : "▾"} {cat} ({items.filter(s => selected.includes(s.id)).length}/{items.length})
              </div>
              {!collapsedCats[cat] && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{items.map(s => <Chip key={s.id} label={s.name} active={selected.includes(s.id)} onClick={() => toggle(s.id)}/>)}</div>}
            </div>
          );
        })}
      </div>
      {selected.length > 0 && (
        <Card style={{ marginBottom: 12, background: T.borderLight }}>
          <div style={{ fontSize: 12, color: T.textSec, marginBottom: 6 }}>선택 ({selected.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {selected.map(id => { const s = SYMPTOMS.find(x=>x.id===id); return <Chip key={id} label={s.name} active removable onClick={() => toggle(id)}/>; })}
          </div>
        </Card>
      )}
      <Btn full disabled={!selected.length} onClick={analyze}>증상 분석하기 ({selected.length}개)</Btn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-007: LIFESTYLE
// ═══════════════════════════════════════════════════════════
function LifestyleScreen({ onBack, disease, lifeLogs, setLifeLogs }) {
  const [tab, setTab] = useState("recommend");
  const [subTab, setSubTab] = useState("diet");
  const [logCategory, setLogCategory] = useState("diet");
  const data = LIFESTYLE[disease];
  const cats = { diet: "🥗 식단", exercise: "🏃 운동", sleep: "😴 수면" };
  const weekDays = ["월","화","수","목","금","토","일"];

  const addLog = () => {
    const score = Math.floor(Math.random() * 30) + 60;
    setLifeLogs([...lifeLogs, { date: new Date().toLocaleDateString("ko-KR"), category: logCategory, score, id: Date.now() }]);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>생활습관 관리</div>
      </div>
      {disease && <div style={{ background: T.accentLight, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#065F46" }}>📋 {disease} 기반 맞춤 추천</div>}

      <TabBar tabs={[{id:"recommend",icon:"✨",label:"추천"},{id:"log",icon:"📝",label:"기록"},{id:"trend",icon:"📈",label:"트렌드"}]} active={tab} onChange={setTab}/>

      <div style={{ marginTop: 16 }}>
        {tab === "recommend" && (
          <>
            {!data ? (
              <Card style={{ textAlign: "center", padding: 32 }}><div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div><div style={{ color: T.textSec, fontSize: 14 }}>증상 체크 후 맞춤 추천을 받아보세요</div></Card>
            ) : (
              <>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {Object.entries(cats).map(([k,v]) => <Chip key={k} label={v} active={subTab===k} onClick={() => setSubTab(k)}/>)}
                </div>
                {(data[subTab]||[]).map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < data[subTab].length-1 ? `1px solid ${T.borderLight}` : "none" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, marginTop: 7, flexShrink: 0 }}/>
                    <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6 }}>{item}</div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
        {tab === "log" && (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {Object.entries(cats).map(([k,v]) => <Chip key={k} label={v} active={logCategory===k} onClick={() => setLogCategory(k)}/>)}
            </div>
            <Btn full onClick={addLog}>오늘 {cats[logCategory]} 기록 저장</Btn>
            {lifeLogs.filter(l => l.category === logCategory).length > 0 && (
              <div style={{ marginTop: 16 }}>
                {lifeLogs.filter(l => l.category === logCategory).reverse().map(l => (
                  <Card key={l.id} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, color: T.text }}>{l.date}</div>
                    <Badge label={`${l.score}점`} color={l.score >= 70 ? "green" : "yellow"}/>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
        {tab === "trend" && (
          <Card style={{ textAlign: "center", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: 120, marginBottom: 12 }}>
              {weekDays.map((d, i) => {
                const h = Math.floor(Math.random() * 60) + 30;
                return (
                  <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: 11, color: T.textSec }}>{h}</div>
                    <div style={{ width: 28, height: h, borderRadius: 4, background: h > 60 ? T.accent + "40" : T.warn + "40" }}/>
                    <div style={{ fontSize: 11, color: T.textTer }}>{d}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 13, color: T.textSec }}>이번 주 평균 점수: <b style={{ color: T.accent }}>72점</b> (전주 대비 ↑5)</div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-008: DRUG INTERACTION
// ═══════════════════════════════════════════════════════════
function DrugCheck({ onBack }) {
  const [drugs, setDrugs] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState(null);
  const [showSug, setShowSug] = useState(false);

  const sugs = search ? ALL_DRUGS.filter(d => d.includes(search) && !drugs.includes(d)) : [];
  const add = n => { if (!drugs.includes(n)) setDrugs([...drugs, n]); setSearch(""); setShowSug(false); };
  const check = () => {
    const found = [];
    for (let i = 0; i < drugs.length; i++)
      for (let j = i+1; j < drugs.length; j++)
        DRUG_INTER.forEach(x => { if ((x.a===drugs[i]&&x.b===drugs[j])||(x.a===drugs[j]&&x.b===drugs[i])) found.push(x); });
    setResults(found);
  };
  const sevColor = s => s === "심각" ? { bg: T.dangerLight, text: T.danger, border: "#FECACA" } : s === "중등" ? { bg: T.warnLight, text: "#92400E", border: "#FDE68A" } : { bg: T.primaryLight, text: T.primary, border: "#BFDBFE" };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>약물 상호작용 체크</div>
      </div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setShowSug(true); }} onFocus={() => setShowSug(true)} placeholder="약물명을 입력하세요..." style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" }}/>
        {showSug && sugs.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, marginTop: 4, zIndex: 10, maxHeight: 150, overflowY: "auto", boxShadow: T.shadowMd }}>
            {sugs.map(s => <div key={s} onClick={() => add(s)} style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13 }} onMouseEnter={e => e.target.style.background = T.borderLight} onMouseLeave={e => e.target.style.background = "#fff"}>{s}</div>)}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
        {ALL_DRUGS.filter(d => !drugs.includes(d)).slice(0,6).map(d => <button key={d} onClick={() => add(d)} style={{ padding: "4px 10px", borderRadius: 16, border: `1px solid ${T.border}`, background: "#fff", fontSize: 11, color: T.textSec, cursor: "pointer" }}>+ {d}</button>)}
      </div>
      {drugs.length > 0 && (
        <Card style={{ marginBottom: 12, background: T.borderLight }}>
          <div style={{ fontSize: 12, color: T.textSec, marginBottom: 6 }}>복용 약물 ({drugs.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {drugs.map(d => <Chip key={d} label={d} active removable onClick={() => setDrugs(drugs.filter(x=>x!==d))}/>)}
          </div>
        </Card>
      )}
      <Btn full disabled={drugs.length < 2} onClick={check} style={{ background: drugs.length >= 2 ? T.warn : T.border, color: drugs.length >= 2 ? "#fff" : T.textTer }}>상호작용 체크 ({drugs.length}개)</Btn>

      {results !== null && (
        <div style={{ marginTop: 16 }}>
          {results.length === 0 ? (
            <Card style={{ background: T.accentLight, textAlign: "center", padding: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#065F46" }}>알려진 상호작용이 없습니다</div>
            </Card>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.danger, marginBottom: 10 }}>⚠ {results.length}건의 상호작용 발견</div>
              {results.map((r, i) => {
                const c = sevColor(r.sev);
                return (
                  <Card key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: c.text }}>{r.a} + {r.b}</div>
                      <Badge label={r.sev} color={r.sev === "심각" ? "red" : r.sev === "중등" ? "yellow" : "blue"}/>
                    </div>
                    <div style={{ fontSize: 13, color: c.text, opacity: .85 }}>{r.desc}</div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-009: AI CHAT
// ═══════════════════════════════════════════════════════════
function ChatScreen({ onBack, disease }) {
  const [messages, setMessages] = useState([
    { role: "ai", text: `안녕하세요! ClinicalCare AI 상담사입니다.${disease ? `\n\n현재 "${disease}" 분석 결과를 기반으로 상담해드릴게요.` : ""}\n\n건강 관련 궁금한 점을 편하게 물어보세요.\n\n※ 본 상담은 의료 행위를 대체하지 않습니다.` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [messages]);

  const send = () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput(""); setMessages(p => [...p, { role: "user", text: q }]); setLoading(true);
    setTimeout(() => {
      let r = "";
      const ql = q.toLowerCase();
      if (ql.includes("식후") || ql.includes("식전") || ql.includes("언제"))
        r = "약물 복용 시점은 종류에 따라 다릅니다.\n\n해열진통제(타이레놀)는 식후 복용이 권장되나 긴급 시 공복 가능합니다.\n소염진통제(이부프로펜)는 반드시 식후에 복용하세요.\n항히스타민제는 시간에 관계없이 복용 가능합니다.\n\n구체적인 약물명을 알려주시면 더 정확한 안내가 가능해요!";
      else if (ql.includes("부작용") || ql.includes("위험"))
        r = "약물 부작용은 개인마다 다르게 나타날 수 있습니다.\n\n일반적으로 주의할 점:\n• 새로운 증상이 나타나면 즉시 복용을 중단하세요\n• 2~3일 이상 복용해도 호전이 없으면 의사와 상담하세요\n• 여러 약을 동시에 복용할 때는 '약물 체크' 기능을 활용해보세요";
      else if (ql.includes("병원") || ql.includes("의사"))
        r = `${disease ? `${disease}의 경우, ` : ""}다음 상황에서는 병원 방문을 권합니다:\n\n• 3일 이상 증상이 호전되지 않을 때\n• 고열(38.5°C 이상)이 지속될 때\n• 일상생활이 어려울 정도로 증상이 심할 때\n\n가까운 내과나 가정의학과를 방문해보세요.`;
      else if (ql.includes("음식") || ql.includes("먹"))
        r = `${disease ? `${disease} 회복을 위해` : "건강을 위해"} 다음을 권장합니다:\n\n• 충분한 수분 섭취 (하루 2L 이상)\n• 비타민 C가 풍부한 과일\n• 소화가 잘 되는 따뜻한 음식\n• 자극적인 음식은 피해주세요\n\n'생활습관' 탭에서 더 자세한 맞춤 식단을 확인해보세요!`;
      else
        r = `${disease ? `${disease} 관련 ` : ""}질문 감사합니다.\n\n좀 더 구체적으로 알려주시면 맞춤 상담을 드릴 수 있어요.\n\n예시 질문:\n• "이 약 식후에 먹어야 하나요?"\n• "부작용이 걱정돼요"\n• "병원에 가야 할까요?"\n• "어떤 음식을 먹으면 좋나요?"`;
      setMessages(p => [...p, { role: "ai", text: r }]); setLoading(false);
    }, 600 + Math.random() * 800);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onBack} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>AI 상담</div>
        {disease && <Badge label={disease}/>}
      </div>
      <div ref={ref} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "user" ? T.primary : T.borderLight,
              color: m.role === "user" ? "#fff" : T.text, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap",
            }}>{m.text}</div>
          </div>
        ))}
        {loading && <div style={{ display: "flex" }}><div style={{ background: T.borderLight, padding: "10px 18px", borderRadius: "14px 14px 14px 4px", fontSize: 13, color: T.textTer }}>답변 작성 중...</div></div>}
      </div>
      <div style={{ padding: "10px 16px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} placeholder="건강 관련 질문을 입력하세요..." style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, outline: "none" }}/>
        <Btn onClick={send} disabled={!input.trim() || loading}>전송</Btn>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-010: HEALTH REPORT
// ═══════════════════════════════════════════════════════════
function ReportScreen({ onBack }) {
  const [type, setType] = useState("weekly");
  const [generated, setGenerated] = useState(false);
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>건강 리포트</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["weekly","주간"],["monthly","월간"],["comprehensive","종합"]].map(([k,v]) => <Chip key={k} label={v} active={type===k} onClick={() => setType(k)}/>)}
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 8 }}>기간 선택</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" defaultValue="2026-03-18" style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }}/>
          <span style={{ alignSelf: "center", color: T.textTer }}>~</span>
          <input type="date" defaultValue="2026-03-25" style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 13 }}/>
        </div>
      </Card>
      <Btn full onClick={() => setGenerated(true)}>📊 리포트 생성</Btn>
      {generated && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 12 }}>✅ 리포트 생성 완료</div>
          <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.7, marginBottom: 12 }}>
            기간: 2026.03.18 ~ 2026.03.25<br/>
            증상 분석: 3회 · 복약 기록: 5건<br/>
            생활습관 평균: 72점 · AI 상담: 2회
          </div>
          <Btn full variant="outline">📥 PDF 다운로드</Btn>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-011: HISTORY
// ═══════════════════════════════════════════════════════════
function HistoryScreen({ onBack, history }) {
  const [filter, setFilter] = useState("all");
  const filters = [["all","전체"],["symptom","증상"],["med","복약"],["lifestyle","생활습관"],["chat","상담"]];
  const items = filter === "all" ? history : history.filter(h => h.type === filter);
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>건강 기록</div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto" }}>
        {filters.map(([k,v]) => <Chip key={k} label={v} active={filter===k} onClick={() => setFilter(k)}/>)}
      </div>
      {items.length === 0 ? (
        <Card style={{ textAlign: "center", padding: 32 }}><div style={{ fontSize: 40, marginBottom: 8 }}>📋</div><div style={{ color: T.textSec }}>아직 기록이 없습니다</div></Card>
      ) : items.map((h, i) => (
        <Card key={i} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{h.title}</div>
              <div style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>{h.desc}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <Badge label={h.badge} color={h.badgeColor}/>
              <div style={{ fontSize: 11, color: T.textTer, marginTop: 4 }}>{h.date}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCR-012: MY PAGE
// ═══════════════════════════════════════════════════════════
function MyPage({ onBack, profile, onEditProfile, onLogout }) {
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={onBack} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>마이페이지</div>
      </div>
      <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: T.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>{profile.age ? `${profile.age}세 · ${profile.gender || "미설정"}` : "프로필 미등록"}</div>
          <div style={{ fontSize: 12, color: T.textSec }}>user@example.com</div>
        </div>
      </Card>
      {[
        { label: "건강 프로필 수정", icon: "❤️", action: onEditProfile },
        { label: "알림 설정", icon: "🔔", action: () => {} },
        { label: "이용약관", icon: "📄", action: () => {} },
        { label: "개인정보처리방침", icon: "🔒", action: () => {} },
      ].map((item, i) => (
        <Card key={i} onClick={item.action} style={{ marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: T.text }}><span>{item.icon}</span> {item.label}</div>
          <span style={{ color: T.textTer }}>→</span>
        </Card>
      ))}
      <Btn full variant="outline" onClick={onLogout} style={{ marginTop: 16 }}>로그아웃</Btn>
      <button onClick={() => {}} style={{ display: "block", margin: "16px auto 0", border: "none", background: "none", color: T.danger, fontSize: 13, cursor: "pointer" }}>회원탈퇴</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP — ROUTER
// ═══════════════════════════════════════════════════════════
export default function ClinicalCareApp() {
  const [screen, setScreen] = useState("onboarding");
  const [profile, setProfile] = useState({});
  const [lastDisease, setLastDisease] = useState(null);
  const [lifeLogs, setLifeLogs] = useState([]);
  const [history, setHistory] = useState([
    { type: "symptom", title: "증상 분석", desc: "두통, 발열, 기침", badge: "감기 85%", badgeColor: "blue", date: "03.24" },
    { type: "lifestyle", title: "생활습관 기록", desc: "식단 기록 완료", badge: "78점", badgeColor: "green", date: "03.24" },
    { type: "chat", title: "AI 상담", desc: "타이레놀 복용법 문의", badge: "완료", badgeColor: "green", date: "03.23" },
  ]);

  const navFromBottom = (id) => {
    const map = { home: "home", history: "history", chat: "chat", my: "my" };
    setScreen(map[id] || "home");
  };

  const activeBottomTab = ["home","history","chat","my"].includes(screen) ? screen : "home";
  const showBottom = !["onboarding","login","profile-setup"].includes(screen);

  const addHistory = (type, title, desc, badge, badgeColor) => {
    setHistory(p => [{ type, title, desc, badge, badgeColor, date: new Date().toLocaleDateString("ko-KR", {month:"2-digit",day:"2-digit"}) }, ...p]);
  };

  const handleResult = (disease) => {
    setLastDisease(disease);
    addHistory("symptom", "증상 분석", `분석 결과: ${disease}`, `${disease}`, "blue");
  };

  const renderScreen = () => {
    switch (screen) {
      case "onboarding": return <Onboarding onDone={() => setScreen("login")}/>;
      case "login": return <Login onLogin={(isNew) => setScreen(isNew ? "profile-setup" : "home")}/>;
      case "profile-setup": return <ProfileSetup onDone={() => setScreen("home")} profile={profile} setProfile={setProfile}/>;
      case "home": return <Home onNav={s => setScreen(s)} profile={profile} lastResult={lastDisease} lifestyleScore={lifeLogs.length > 0 ? lifeLogs[lifeLogs.length-1].score : null}/>;
      case "symptom": return <SymptomChecker onBack={() => setScreen("home")} onResult={handleResult} onNavLifestyle={() => setScreen("lifestyle")} onNavChat={() => setScreen("chat")}/>;
      case "lifestyle": return <LifestyleScreen onBack={() => setScreen("home")} disease={lastDisease} lifeLogs={lifeLogs} setLifeLogs={setLifeLogs}/>;
      case "drug": return <DrugCheck onBack={() => setScreen("home")}/>;
      case "chat": return <ChatScreen onBack={() => setScreen("home")} disease={lastDisease}/>;
      case "report": return <ReportScreen onBack={() => setScreen("home")}/>;
      case "history": return <HistoryScreen onBack={() => setScreen("home")} history={history}/>;
      case "my": return <MyPage onBack={() => setScreen("home")} profile={profile} onEditProfile={() => setScreen("profile-setup")} onLogout={() => { setScreen("login"); setProfile({}); setLastDisease(null); }}/>;
      default: return <Home onNav={s => setScreen(s)} profile={profile}/>;
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column", background: T.bg, fontFamily: "'Pretendard Variable', -apple-system, sans-serif" }}>
      <link rel="stylesheet" href={fontUrl}/>
      <div style={{ flex: 1, overflowY: "auto" }}>{renderScreen()}</div>
      {showBottom && <BottomNav active={activeBottomTab} onChange={navFromBottom}/>}
    </div>
  );
}
