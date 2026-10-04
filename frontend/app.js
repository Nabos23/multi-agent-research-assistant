/* ==========================================================================
   INSIGHT GRAPH - 3D INTERACTIVE APP & AGENT ENGINE (DB SESSION PERSISTENCE)
   ========================================================================== */

const API_BASE = "http://localhost:8000/api";

// App State
const state = {
  activeSessionId: null,
  activeTopic: "",
  isStreaming: false,
  eventSource: null,
  sessions: [],
  currentStepIndex: -1,
  qualityScore: 0.0,
  iterations: 0,
  speechSynth: window.speechSynthesis || null,
  speechUtterance: null,
  isSpeaking: false,
  isRecording: false,
  recognition: null
};

// Node Steps Mapping
const NODES = [
  { id: "input_processor", label: "Input Processor", icon: "🧠", desc: "Refining & structuring topic" },
  { id: "question_gen", label: "Question Gen", icon: "❓", desc: "Formulating research angles" },
  { id: "search_tool", label: "Web Search", icon: "🔍", desc: "Gathering live web data" },
  { id: "analyzer", label: "Analyzer", icon: "📊", desc: "Evaluating findings quality" },
  { id: "report_gen", label: "Report Gen", icon: "📝", desc: "Compiling markdown report" }
];

// DOM Elements
const elements = {
  sidebar: document.getElementById("sidebar"),
  mobileToggle: document.getElementById("mobile-toggle"),
  newTopicBtn: document.getElementById("new-topic-btn"),
  historyList: document.getElementById("history-list"),
  heroView: document.getElementById("hero-view"),
  chatStreamView: document.getElementById("chat-stream-view"),
  userMsgText: document.getElementById("user-msg-text"),
  userMsgTime: document.getElementById("user-msg-time"),
  activeTopicBadge: document.getElementById("active-topic-badge"),
  pipelineStepper: document.getElementById("pipeline-stepper"),
  eventLogDrawer: document.getElementById("event-log-drawer"),
  reportCard: document.getElementById("report-card"),
  reportMarkdown: document.getElementById("report-markdown"),
  qualityScoreEl: document.getElementById("quality-score-val"),
  iterationCountEl: document.getElementById("iteration-count-val"),
  chatForm: document.getElementById("chat-form"),
  topicInput: document.getElementById("topic-input"),
  sendBtn: document.getElementById("send-btn"),
  micBtn: document.getElementById("mic-btn"),
  copyReportBtn: document.getElementById("copy-report-btn"),
  downloadReportBtn: document.getElementById("download-report-btn"),
  speakReportBtn: document.getElementById("speak-report-btn"),
  soundToggleBtn: document.getElementById("sound-toggle-btn")
};

// Web Audio API Sound Effects
let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (!soundEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'step') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'done') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      osc.frequency.setValueAtTime(1046.50, now + 0.3);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    console.warn("Audio play error", e);
  }
}

// ==========================================================================
// 1. THREE.JS 3D ANIMATED BACKGROUND & NEURAL PARTICLES
// ==========================================================================

let threeScene, threeCamera, threeRenderer, particleSystem, orbMesh;
let targetParticleSpeed = 0.0015;
let currentParticleSpeed = 0.0015;

function init3DBackground() {
  const canvas = document.getElementById("three-canvas");
  if (!canvas || !window.THREE) return;

  threeScene = new THREE.Scene();
  threeCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  threeCamera.position.z = 40;

  threeRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  threeRenderer.setSize(window.innerWidth, window.innerHeight);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Particles Neural Sphere
  const particleCount = 1200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const colorPrimary = new THREE.Color(0x6366f1);
  const colorCyan = new THREE.Color(0x06b6d4);

  for (let i = 0; i < particleCount; i++) {
    const radius = 22 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const mixedColor = colorPrimary.clone().lerp(colorCyan, Math.random());
    colors[i * 3] = mixedColor.r;
    colors[i * 3 + 1] = mixedColor.g;
    colors[i * 3 + 2] = mixedColor.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });

  particleSystem = new THREE.Points(geometry, material);
  threeScene.add(particleSystem);

  // Floating Icosahedron Node Grid
  const icoGeo = new THREE.IcosahedronGeometry(8, 1);
  const icoMat = new THREE.MeshBasicMaterial({
    color: 0x818cf8,
    wireframe: true,
    transparent: true,
    opacity: 0.15
  });
  orbMesh = new THREE.Mesh(icoGeo, icoMat);
  threeScene.add(orbMesh);

  // Mouse Interaction
  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.0005;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.0005;
  });

  // Render Loop
  function animate() {
    requestAnimationFrame(animate);

    currentParticleSpeed += (targetParticleSpeed - currentParticleSpeed) * 0.05;

    particleSystem.rotation.y += currentParticleSpeed;
    particleSystem.rotation.x += currentParticleSpeed * 0.5;
    orbMesh.rotation.y -= currentParticleSpeed * 0.8;
    orbMesh.rotation.z += currentParticleSpeed * 0.4;

    threeCamera.position.x += (mouseX * 20 - threeCamera.position.x) * 0.05;
    threeCamera.position.y += (-mouseY * 20 - threeCamera.position.y) * 0.05;
    threeCamera.lookAt(threeScene.position);

    threeRenderer.render(threeScene, threeCamera);
  }
  animate();

  window.addEventListener('resize', () => {
    threeCamera.aspect = window.innerWidth / window.innerHeight;
    threeCamera.updateProjectionMatrix();
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ==========================================================================
// 2. APPLICATION CONTROLLER & DB SESSION MANAGEMENT
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  init3DBackground();
  fetchSessions();
  buildPipelineStepper();
  setupEventListeners();
  setupVoiceRecognition();
});

// Build Pipeline Stepper DOM
function buildPipelineStepper() {
  elements.pipelineStepper.innerHTML = "";
  NODES.forEach((node, index) => {
    const stepEl = document.createElement("div");
    stepEl.className = "pipeline-step";
    stepEl.id = `step-${node.id}`;
    stepEl.innerHTML = `
      <div class="step-node">${index + 1}</div>
      <div class="step-label">${node.label}</div>
    `;
    elements.pipelineStepper.appendChild(stepEl);
  });
}

// Event Listeners Initialization
function setupEventListeners() {
  // Mobile Sidebar Toggle
  elements.mobileToggle.addEventListener("click", () => {
    elements.sidebar.classList.toggle("open");
  });

  // New Topic Button
  elements.newTopicBtn.addEventListener("click", showHeroView);

  // Chat Form Submit
  elements.chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const topic = elements.topicInput.value.trim();
    if (topic && !state.isStreaming) {
      createNewSessionAndResearch(topic);
    }
  });

  // Auto-expanding Textarea
  elements.topicInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
  });

  // Prompt Cards Click
  document.querySelectorAll(".prompt-card").forEach((card) => {
    card.addEventListener("click", () => {
      const topic = card.getAttribute("data-topic");
      if (topic) {
        elements.topicInput.value = topic;
        createNewSessionAndResearch(topic);
      }
    });
  });

  // Report Copy
  elements.copyReportBtn.addEventListener("click", () => {
    const text = elements.reportMarkdown.innerText;
    navigator.clipboard.writeText(text).then(() => {
      elements.copyReportBtn.innerHTML = `✓ Copied`;
      setTimeout(() => elements.copyReportBtn.innerHTML = `📋 Copy`, 2000);
    });
  });

  // Report Download
  elements.downloadReportBtn.addEventListener("click", () => {
    const text = elements.reportMarkdown.innerText;
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(state.activeTopic || "research").replace(/[^a-z0-9]/gi, '_').toLowerCase()}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Report Speak (Text-to-speech)
  elements.speakReportBtn.addEventListener("click", toggleSpeech);

  // Sound Toggle
  elements.soundToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    elements.soundToggleBtn.innerHTML = soundEnabled ? `🔔` : `🔕`;
  });
}

// Voice Input Integration
function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.micBtn.style.display = "none";
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = false;
  state.recognition.interimResults = false;

  state.recognition.onstart = () => {
    state.isRecording = true;
    elements.micBtn.classList.add("recording");
  };

  state.recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    elements.topicInput.value = transcript;
  };

  state.recognition.onend = () => {
    state.isRecording = false;
    elements.micBtn.classList.remove("recording");
  };

  elements.micBtn.addEventListener("click", () => {
    if (state.isRecording) {
      state.recognition.stop();
    } else {
      state.recognition.start();
    }
  });
}

// Speech Synthesis Toggle
function toggleSpeech() {
  if (!state.speechSynth) return;

  if (state.isSpeaking) {
    state.speechSynth.cancel();
    state.isSpeaking = false;
    elements.speakReportBtn.innerHTML = `🔊 Read Aloud`;
  } else {
    const text = elements.reportMarkdown.innerText;
    state.speechUtterance = new SpeechSynthesisUtterance(text.substring(0, 1000));
    state.speechUtterance.onend = () => {
      state.isSpeaking = false;
      elements.speakReportBtn.innerHTML = `🔊 Read Aloud`;
    };
    state.speechSynth.speak(state.speechUtterance);
    state.isSpeaking = true;
    elements.speakReportBtn.innerHTML = `⏹️ Stop`;
  }
}

// Show Hero View
function showHeroView() {
  state.activeSessionId = null;
  state.activeTopic = "";
  if (state.eventSource) state.eventSource.close();
  state.isStreaming = false;

  elements.heroView.style.display = "flex";
  elements.chatStreamView.style.display = "none";
  elements.activeTopicBadge.style.display = "none";
  elements.topicInput.value = "";
  targetParticleSpeed = 0.0015;

  renderHistory();
}

// ==========================================================================
// 3. BACKEND SESSION FETCHING & PERSISTENCE
// ==========================================================================

async function fetchSessions() {
  try {
    const res = await fetch(`${API_BASE}/sessions`);
    if (res.ok) {
      state.sessions = await res.json();
      renderHistory();
    }
  } catch (err) {
    console.error("Failed to fetch sessions", err);
  }
}

async function createNewSessionAndResearch(topic) {
  try {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: topic })
    });
    if (res.ok) {
      const data = await res.json();
      state.activeSessionId = data.session_id;
      startResearch(topic, data.session_id);
    } else {
      startResearch(topic, null);
    }
  } catch (err) {
    console.warn("Session POST failed, falling back to direct research", err);
    startResearch(topic, null);
  }
}

async function loadSessionDetails(sessionId) {
  try {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
    if (res.ok) {
      const data = await res.json();
      state.activeSessionId = data.session_id;
      state.activeTopic = data.topic;

      elements.heroView.style.display = "none";
      elements.chatStreamView.style.display = "flex";
      elements.activeTopicBadge.style.display = "flex";
      elements.activeTopicBadge.innerHTML = `<span>Topic:</span> <strong>${escapeHtml(data.topic || "Session")}</strong>`;

      elements.userMsgText.textContent = data.topic || "Research Session";
      elements.userMsgTime.textContent = new Date(data.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Mark stepper complete
      NODES.forEach(n => {
        const el = document.getElementById(`step-${n.id}`);
        if (el) el.className = "pipeline-step completed";
      });

      elements.eventLogDrawer.innerHTML = `<div class="log-entry"><span class="log-node">&lt;Session&gt;</span> <span class="log-msg">Loaded historical session ${sessionId}</span></div>`;

      if (data.final_report) {
        if (window.marked && window.DOMPurify) {
          elements.reportMarkdown.innerHTML = DOMPurify.sanitize(marked.parse(data.final_report));
        } else {
          elements.reportMarkdown.textContent = data.final_report;
        }
        elements.reportCard.classList.add("active");
      } else {
        elements.reportMarkdown.textContent = "No final report generated for this session.";
        elements.reportCard.classList.add("active");
      }
      
      renderHistory();
    }
  } catch (err) {
    console.error("Failed to load session details", err);
  }
}

async function deleteSession(sessionId) {
  try {
    await fetch(`${API_BASE}/sessions/${sessionId}`, { method: "DELETE" });
    fetchSessions();
  } catch (err) {
    console.error("Failed to delete session", err);
  }
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  if (state.sessions.length === 0) {
    elements.historyList.innerHTML = `<li style="font-size:0.78rem; color:var(--text-muted); padding:6px;">No previous sessions found</li>`;
    return;
  }

  state.sessions.forEach(item => {
    const li = document.createElement("li");
    li.className = "history-item" + (item.session_id === state.activeSessionId ? " active" : "");
    const titleText = item.topic || `Session ${item.session_id.substring(0, 8)}`;
    
    li.innerHTML = `
      <span title="${escapeHtml(titleText)}">${escapeHtml(titleText)}</span>
      <button class="delete-btn" title="Delete Session">✕</button>
    `;

    li.querySelector("span").addEventListener("click", () => {
      loadSessionDetails(item.session_id);
    });

    li.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSession(item.session_id);
    });

    elements.historyList.appendChild(li);
  });
}

// ==========================================================================
// 4. RESEARCH STREAMING EXECUTION
// ==========================================================================

function startResearch(topic, sessionId) {
  state.activeTopic = topic;
  state.isStreaming = true;
  state.qualityScore = 0.45;
  state.iterations = 1;

  // Update UI Views
  elements.heroView.style.display = "none";
  elements.chatStreamView.style.display = "flex";
  elements.activeTopicBadge.style.display = "flex";
  elements.activeTopicBadge.innerHTML = `<span>Topic:</span> <strong>${escapeHtml(topic)}</strong>`;
  
  elements.userMsgText.textContent = topic;
  elements.userMsgTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Reset Execution Stepper & Logs
  resetPipelineUI();
  elements.reportCard.classList.remove("active");
  elements.sendBtn.disabled = true;

  // Accelerate 3D particle speed
  targetParticleSpeed = 0.006;

  // Log initial status
  addLogEntry("system", "Connecting to autonomous LangGraph pipeline...");

  // Open SSE Connection
  let url = `${API_BASE}/research?topic=${encodeURIComponent(topic)}`;
  if (sessionId) {
    url += `&session_id=${encodeURIComponent(sessionId)}`;
  }

  state.eventSource = new EventSource(url);

  state.eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.session_id && !state.activeSessionId) {
        state.activeSessionId = data.session_id;
      }

      if (data.done) {
        finishResearch(data.report);
        return;
      }

      if (data.node) {
        updateStepProgress(data.node, data.status);
      }
    } catch (err) {
      console.error("SSE parse error", err);
    }
  };

  state.eventSource.onerror = (err) => {
    console.error("SSE Connection Error", err);
    addLogEntry("error", "Connection failed. Check backend API at localhost:8000.");
    state.isStreaming = false;
    elements.sendBtn.disabled = false;
    targetParticleSpeed = 0.0015;
    state.eventSource.close();
  };
}

function updateStepProgress(nodeName, status) {
  playSound('step');
  
  const index = NODES.findIndex(n => n.id === nodeName || nodeName.includes(n.id));
  if (index !== -1) {
    state.currentStepIndex = index;

    NODES.forEach((n, i) => {
      const el = document.getElementById(`step-${n.id}`);
      if (!el) return;
      if (i < index) {
        el.className = "pipeline-step completed";
      } else if (i === index) {
        el.className = "pipeline-step active";
      } else {
        el.className = "pipeline-step";
      }
    });
  }

  state.qualityScore = Math.min(0.98, state.qualityScore + 0.12);
  elements.qualityScoreEl.textContent = `${Math.round(state.qualityScore * 100)}%`;
  elements.iterationCountEl.textContent = state.iterations;

  const nodeInfo = NODES.find(n => n.id === nodeName) || { label: nodeName };
  addLogEntry(nodeInfo.label, status || "Processing node state...");
}

function resetPipelineUI() {
  NODES.forEach(n => {
    const el = document.getElementById(`step-${n.id}`);
    if (el) el.className = "pipeline-step";
  });
  elements.eventLogDrawer.innerHTML = "";
  elements.qualityScoreEl.textContent = "0%";
  elements.iterationCountEl.textContent = "0";
}

function addLogEntry(nodeLabel, message) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-node">&lt;${escapeHtml(nodeLabel)}&gt;</span>
    <span class="log-msg">${escapeHtml(message)}</span>
  `;
  elements.eventLogDrawer.appendChild(entry);
  elements.eventLogDrawer.scrollTop = elements.eventLogDrawer.scrollHeight;
}

function finishResearch(reportContent) {
  playSound('done');
  state.isStreaming = false;
  elements.sendBtn.disabled = false;
  targetParticleSpeed = 0.0015;

  if (state.eventSource) state.eventSource.close();

  NODES.forEach(n => {
    const el = document.getElementById(`step-${n.id}`);
    if (el) el.className = "pipeline-step completed";
  });

  elements.qualityScoreEl.textContent = "98%";
  addLogEntry("system", "Research process completed successfully!");

  if (window.marked && window.DOMPurify) {
    elements.reportMarkdown.innerHTML = DOMPurify.sanitize(marked.parse(reportContent));
  } else {
    elements.reportMarkdown.textContent = reportContent;
  }

  elements.reportCard.classList.add("active");
  elements.reportCard.scrollIntoView({ behavior: 'smooth' });

  if (window.confetti) {
    window.confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  // Refresh sessions list from DB
  fetchSessions();
}

// Utility
function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
