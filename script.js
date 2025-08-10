let mediaRecorder;
let audioChunks = [];
let englishText = "";

const el = (id) => document.getElementById(id);

function setTheme(dark = true) {
  if (dark) {
    document.body.classList.remove("light");
    el("themeToggle").textContent = "☀️";
  } else {
    document.body.classList.add("light");
    el("themeToggle").textContent = "🌙";
  }
}

window.addEventListener("load", () => {
  setTheme(true);
  el("themeToggle").addEventListener("click", () => {
    const isDark = !document.body.classList.contains("light");
    setTheme(!isDark);
  });
  el("quipToggle").addEventListener("click", () => {
    el("quipToggle").classList.toggle("active");
  });
  el("recordBtn").addEventListener("click", startRecording);
  el("fileInput").addEventListener("change", handleFile);
  el("ttsBtn").addEventListener("click", playTTS);
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () =>
      processBlob(new Blob(audioChunks, { type: "audio/webm" }));
    mediaRecorder.start();
    el("recordBtn").textContent = "⏹️ Stop";
    el("recordBtn").onclick = stopRecording;
  } catch (err) {
    alert("Microphone permission required on HTTPS. " + err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  el("recordBtn").textContent = "🎙️ Record";
  el("recordBtn").onclick = startRecording;
}

function handleFile(ev) {
  const file = ev.target.files[0];
  if (file) processBlob(file);
}

async function processBlob(blob) {
  const apiUrl = el("apiUrl").value.trim();
  if (!apiUrl) {
    alert("Enter your backend HTTPS URL first.");
    return;
  }

  const form = new FormData();
  form.append("file", blob, "input.webm");
  form.append("auto_mode", el("autoMode").checked);
  form.append("name_trigger", el("nameTrigger").checked);
  form.append("trigger_names", "aaron,alin,aluin");
  form.append("quip_mode", el("quipToggle").classList.contains("active"));

  try {
    const res = await fetch(apiUrl + "/transcribe-translate", {
      method: "POST",
      body: form,
    });

    if (res.status === 204) {
      // Name trigger didn't match; ignore silently
      return;
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || "HTTP " + res.status);
    }
    const data = await res.json();
    renderResult(data);
  } catch (err) {
    alert("Error: " + err.message);
  }
}

function renderResult(data) {
  el("chinese").textContent = data.chinese || "";
  el("pinyin").textContent = data.pinyin || "";
  englishText = data.english || "";
  el("english").textContent = englishText;

  const cont = document.getElementById("suggestions");
  cont.innerHTML = "";
  const pins = data.suggestions || [];
  const engs = data.suggestions_en || [];
  for (let i = 0; i < pins.length; i++) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.title = engs[i] || "";
    chip.textContent = pins[i];
    chip.onclick = () => copyToClipboard(pins[i]);
    cont.appendChild(chip);
  }
}

function playTTS() {
  if (!englishText) return;
  const u = new SpeechSynthesisUtterance(englishText);
  u.lang = "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    // ignore
  }
}
