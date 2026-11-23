import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { translations, LANG_CODE_MAP } from '../i18n';
import { useLanguage } from '../LanguageContext';
import { supabase } from '../supabaseClient';

export default function ReportIssue() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = translations[lang].report;
  const tc = translations[lang].categories;
  const langCode = LANG_CODE_MAP[lang];
  const voiceSupported = langCode !== 'or';

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'pothole',
  });
  const [photo, setPhoto] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const categories = ['pothole', 'garbage', 'streetlight', 'water', 'drainage', 'other'];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = handleRecordingStop;

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const handleRecordingStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    setTranscribing(true);

    try {
      const audioData = new FormData();
      audioData.append('audio', audioBlob, 'recording.webm');
      audioData.append('language', langCode);

      const res = await fetch(`${API_BASE_URL}/api/grievances/transcribe`, {
        method: 'POST',
        body: audioData,
      });
      const data = await res.json();
      setTranscript(data);
    } catch (err) {
      console.error('Transcription failed:', err);
    } finally {
      setTranscribing(false);
    }
  };

  const applyTranscript = () => {
    if (transcript?.transcript) {
      setForm({ ...form, description: transcript.transcript });
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setSuggestion(null);
    setAnalyzingPhoto(true);

    try {
      const photoData = new FormData();
      photoData.append('photo', file);
      const res = await fetch(`${API_BASE_URL}/api/grievances/suggest-category`, {
        method: 'POST',
        body: photoData,
      });
      const data = await res.json();
      setSuggestion(data);
    } catch (err) {
      console.error('Photo analysis failed:', err);
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const applySuggestion = () => {
    if (suggestion?.suggestedCategory) {
      setForm({ ...form, category: suggestion.suggestedCategory });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const submitData = new FormData();
      submitData.append('title', form.title);
      submitData.append('description', form.description);
      submitData.append('category', form.category);
      if (photo) submitData.append('photo', photo);

      const { data: { session } } = await supabase.auth.getSession();

      const headers = {};
      if (session) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/grievances`, {
        method: 'POST',
        body: submitData,
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      navigate(`/issue/${data.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-white border-2 border-[#E5EEEC] rounded-xl px-4 py-3 text-[#0B1F3A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0EA5A0] transition-colors';
  const labelClass = 'block text-sm font-semibold text-[#0B1F3A] mb-2';

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        .display-font { font-family: 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="max-w-xl mx-auto px-6 py-16">
        <Link to="/" className="text-sm font-medium text-[#0EA5A0] hover:underline mb-6 inline-block">{t.backToHome}</Link>

        <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-3">{t.tag}</p>
        <h1 className="display-font text-3xl md:text-4xl font-bold text-[#0B1F3A] mb-2">{t.heading}</h1>
        <p className="text-[#64748B] mb-8">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E5EEEC] rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <label className={labelClass}>{t.titleLabel}</label>
            <input
              type="text"
              name="title"
              required
              value={form.title}
              onChange={handleChange}
              className={inputClass}
              placeholder={t.titlePlaceholder}
            />
          </div>

          <div>
            <label className={labelClass}>{t.descriptionLabel}</label>
            <textarea
              name="description"
              required
              rows={4}
              value={form.description}
              onChange={handleChange}
              className={inputClass}
              placeholder={t.descriptionPlaceholder}
            />
          </div>

          <div>
            <label className={labelClass}>{t.voiceLabel}</label>

            {voiceSupported ? (
              <>
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={`text-sm font-semibold px-5 py-2.5 rounded-full transition-colors ${
                    recording
                      ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100'
                      : 'bg-[#F0FDFA] text-[#0EA5A0] border-2 border-[#CFEFEC] hover:bg-[#E0FBF7]'
                  }`}
                >
                  {recording ? t.stopRecording : t.startRecording}
                </button>

                {transcribing && (
                  <p className="text-xs text-[#94A3B8] mt-3">{t.transcribing}</p>
                )}

                {transcript && (
                  <div className="mt-3 p-4 bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl">
                    <p className="text-sm text-[#0B1F3A]">{transcript.transcript}</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {t.languageLabel}: {transcript.detectedLanguage} · {t.confidenceLabel}: {Math.round(transcript.confidence * 100)}%
                      {transcript.lowConfidence && <span className="text-amber-600"> · {t.lowConfidenceWarning}</span>}
                    </p>
                    <button
                      type="button"
                      onClick={applyTranscript}
                      className="text-xs font-semibold text-[#0EA5A0] bg-white border border-[#CFEFEC] px-3 py-1.5 rounded-full mt-3 hover:bg-[#E0FBF7]"
                    >
                      {t.useAsDescription}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[#94A3B8] italic">{t.voiceUnavailable}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>{t.photoLabel}</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full text-sm text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#F0FDFA] file:text-[#0EA5A0] file:font-semibold hover:file:bg-[#E0FBF7]"
            />
            {analyzingPhoto && (
              <p className="text-xs text-[#94A3B8] mt-3">{t.analyzingPhoto}</p>
            )}
            {suggestion && suggestion.suggestedCategory && (
              <div className="mt-3 p-4 bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl flex items-center justify-between gap-3">
                <p className="text-sm text-[#0B1F3A]">
                  {t.suggestedCategory}: <span className="font-semibold capitalize">{tc[suggestion.suggestedCategory] || suggestion.suggestedCategory}</span>
                  <span className="text-[#64748B]"> ({Math.round(suggestion.confidence * 100)}% {t.confidencePercent})</span>
                </p>
                <button
                  type="button"
                  onClick={applySuggestion}
                  className="text-xs font-semibold text-[#0EA5A0] bg-white border border-[#CFEFEC] px-3 py-1.5 rounded-full shrink-0 hover:bg-[#E0FBF7]"
                >
                  {t.useThis}
                </button>
              </div>
            )}
            {suggestion && !suggestion.suggestedCategory && (
              <p className="text-xs text-[#94A3B8] mt-3">
                {t.couldntSuggest}
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>{t.categoryLabel}</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className={inputClass}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{tc[c]}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#0B1F3A] text-white font-semibold py-3.5 rounded-full hover:bg-[#0EA5A0] transition-colors disabled:opacity-60"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}