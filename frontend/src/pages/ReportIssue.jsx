import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { translations, LANG_CODE_MAP } from '../i18n';
import { useLanguage } from '../LanguageContext';
import { supabase } from '../supabaseClient';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function DraggableMarker({ position, onMove }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng);
    },
  });

  return (
    <Marker
      draggable
      position={position}
      eventHandlers={{
        dragend: (e) => onMove(e.target.getLatLng()),
      }}
    />
  );
}

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

  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [locationError, setLocationError] = useState('');
  const [address, setAddress] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [locationMode, setLocationMode] = useState('gps');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [submittedId, setSubmittedId] = useState(null);
  const [copied, setCopied] = useState(false);

  const [nearby, setNearby] = useState([]);
  const [supportedIds, setSupportedIds] = useState([]);

  const categories = ['pothole', 'garbage', 'streetlight', 'water', 'drainage', 'other'];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationMode === 'manual' && searchQuery) {
        searchAddress(searchQuery);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Look for open issues of the same category within 100 m of the pin
  useEffect(() => {
    if (!location) {
      setNearby([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(
        `${API_BASE_URL}/api/grievances/nearby?lat=${location.lat}&lng=${location.lng}&radius=100&category=${form.category}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && Array.isArray(data)) setNearby(data);
        })
        .catch(() => {});
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [location?.lat, location?.lng, form.category]);

  const handleSupport = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/grievances/${id}/upvote`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to support');
      setSupportedIds((prev) => [...prev, id]);
      setNearby((prev) =>
        prev.map((g) => (g.id === id ? { ...g, upvotes: data.upvotes ?? g.upvotes + 1 } : g))
      );
    } catch (err) {
      console.error('Support failed:', err);
    }
  };

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

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      return data.display_name || 'Address not found';
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      return 'Address not found';
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('loading');
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setLocation({
          lat,
          lng,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          source: 'gps',
        });
        setLocationStatus('success');

        setAddressLoading(true);
        const addr = await reverseGeocode(lat, lng);
        setAddress(addr);
        setAddressLoading(false);
      },
      (err) => {
        setLocationStatus('error');
        setLocationError(
          err.code === 1
            ? 'Location permission denied.'
            : 'Could not get your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const searchAddress = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Address search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    setLocation({
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      accuracy: null,
      timestamp: new Date().toISOString(),
      source: 'manual',
    });
    setAddress(result.display_name);
    setLocationStatus('success');
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  const handleMarkerMove = async (latlng) => {
    setLocation({ ...location, lat: latlng.lat, lng: latlng.lng, source: 'manual' });
    setAddressLoading(true);
    const addr = await reverseGeocode(latlng.lat, latlng.lng);
    setAddress(addr);
    setAddressLoading(false);
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(String(submittedId));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
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

      if (location) {
        submitData.append('latitude', location.lat);
        submitData.append('longitude', location.lng);
        if (location.accuracy != null) {
          submitData.append('location_accuracy', location.accuracy);
        }
        submitData.append('location_source', location.source);
        submitData.append('location_timestamp', location.timestamp);
        submitData.append('address', address);
      }

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
      setSubmittedId(data.id);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-white border-2 border-[#E5EEEC] rounded-xl px-4 py-3 text-[#0B1F3A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0EA5A0] transition-colors';
  const labelClass = 'block text-sm font-semibold text-[#0B1F3A] mb-2';

  if (submittedId) {
    return (
      <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
          .display-font { font-family: 'Space Grotesk', sans-serif; }
        `}</style>

        <div className="max-w-xl mx-auto px-6 py-16">
          <div className="bg-white border border-[#E5EEEC] rounded-3xl p-8 shadow-sm text-center">
            <div className="w-14 h-14 rounded-full bg-[#F0FDFA] border border-[#CFEFEC] flex items-center justify-center mx-auto mb-4 text-2xl">
              ✅
            </div>
            <p className="display-font text-xs font-semibold tracking-[0.2em] text-[#0EA5A0] mb-2">
              REPORT SUBMITTED
            </p>
            <h1 className="display-font text-2xl md:text-3xl font-bold text-[#0B1F3A] mb-2">
              Thank you, we have your report
            </h1>
            <p className="text-sm text-[#64748B] mb-6">
              Save this grievance ID. You can use it any time to check the status of your complaint.
            </p>

            <div className="bg-[#F8FAF9] border border-[#E5EEEC] rounded-2xl p-4 mb-4">
              <p className="text-[11px] text-[#94A3B8] mb-1">Your grievance ID</p>
              <p className="text-sm font-semibold text-[#0B1F3A] break-all select-all">{submittedId}</p>
            </div>

            <button
              type="button"
              onClick={copyId}
              className="text-sm font-semibold px-5 py-2.5 rounded-full bg-[#F0FDFA] text-[#0EA5A0] border-2 border-[#CFEFEC] hover:bg-[#E0FBF7] transition-colors mb-6"
            >
              {copied ? '✓ Copied' : '📋 Copy ID'}
            </button>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={`/track/${submittedId}`}
                className="flex-1 bg-[#0B1F3A] text-white font-semibold py-3 rounded-full hover:bg-[#0EA5A0] transition-colors text-sm"
              >
                Track status
              </Link>
              <Link
                to={`/issue/${submittedId}`}
                className="flex-1 bg-white text-[#0B1F3A] border-2 border-[#E5EEEC] font-semibold py-3 rounded-full hover:border-[#0EA5A0] transition-colors text-sm"
              >
                View my issue
              </Link>
            </div>

            <button
              type="button"
              onClick={() => navigate(0)}
              className="text-xs text-[#64748B] hover:text-[#0EA5A0] hover:underline mt-5"
            >
              Report another issue
            </button>
          </div>
        </div>
      </div>
    );
  }

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

          <div>
            <label className={labelClass}>Location</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setLocationMode('gps')}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-colors ${
                  locationMode === 'gps'
                    ? 'bg-[#0B1F3A] text-white border-[#0B1F3A]'
                    : 'bg-white text-[#64748B] border-[#E5EEEC]'
                }`}
              >
                📍 Use live location
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('manual')}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full border transition-colors ${
                  locationMode === 'manual'
                    ? 'bg-[#0B1F3A] text-white border-[#0B1F3A]'
                    : 'bg-white text-[#64748B] border-[#E5EEEC]'
                }`}
              >
                🗺️ Enter manually
              </button>
            </div>

            {locationMode === 'gps' && (
              <>
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={locationStatus === 'loading'}
                  className="text-sm font-semibold px-5 py-2.5 rounded-full bg-[#F0FDFA] text-[#0EA5A0] border-2 border-[#CFEFEC] hover:bg-[#E0FBF7] transition-colors disabled:opacity-60"
                >
                  {locationStatus === 'loading' ? 'Getting location...' : '📍 Use My Live Location'}
                </button>

                {locationStatus === 'error' && (
                  <p className="text-xs text-red-600 mt-3">{locationError}</p>
                )}

                {locationStatus === 'success' && location && (
                  <div className="mt-3">
                    <p className="text-xs text-[#64748B] mb-2">
                      Move the pin if the problem is not exactly at your current position.
                    </p>
                    <div className="rounded-xl overflow-hidden border-2 border-[#E5EEEC]" style={{ height: '250px' }}>
                      <MapContainer
                        center={[location.lat, location.lng]}
                        zoom={17}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <DraggableMarker
                          position={[location.lat, location.lng]}
                          onMove={handleMarkerMove}
                        />
                      </MapContainer>
                    </div>
                    {location.accuracy != null && (
                      <p className="text-xs text-[#64748B] mt-2">
                        Accuracy: {Math.round(location.accuracy)}m
                      </p>
                    )}
                    <div className="mt-2 p-3 bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl">
                      {addressLoading ? (
                        <p className="text-xs text-[#94A3B8]">Fetching address...</p>
                      ) : (
                        <p className="text-xs text-[#0B1F3A]">{address}</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {locationMode === 'manual' && (
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for an address"
                  className={inputClass}
                />
                {searching && (
                  <p className="text-xs text-[#94A3B8] mt-2">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-[#E5EEEC] rounded-xl overflow-hidden">
                    {searchResults.map((r) => (
                      <button
                        key={r.place_id}
                        type="button"
                        onClick={() => selectSearchResult(r)}
                        className="w-full text-left text-xs px-4 py-2.5 hover:bg-[#F0FDFA] border-b border-[#E5EEEC] last:border-b-0"
                      >
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}

                {location && locationStatus === 'success' && (
                  <div className="mt-3">
                    <p className="text-xs text-[#64748B] mb-2">
                      Drag the pin to fine-tune the exact spot.
                    </p>
                    <div className="rounded-xl overflow-hidden border-2 border-[#E5EEEC]" style={{ height: '250px' }}>
                      <MapContainer
                        center={[location.lat, location.lng]}
                        zoom={17}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <DraggableMarker
                          position={[location.lat, location.lng]}
                          onMove={handleMarkerMove}
                        />
                      </MapContainer>
                    </div>
                    <div className="mt-2 p-3 bg-[#F0FDFA] border border-[#CFEFEC] rounded-xl">
                      {addressLoading ? (
                        <p className="text-xs text-[#94A3B8]">Fetching address...</p>
                      ) : (
                        <p className="text-xs text-[#0B1F3A]">{address}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {nearby.length > 0 && (
            <div className="bg-[#F0FDFA] border border-[#CFEFEC] rounded-2xl p-4">
              <p className="text-sm font-semibold text-[#0B1F3A] mb-1">
                {nearby.length} similar issue{nearby.length > 1 ? 's' : ''} already reported nearby
              </p>
              <p className="text-xs text-[#64748B] mb-3">
                If it is the same problem, support it instead of reporting again. If not, just continue and submit.
              </p>
              <div className="space-y-2">
                {nearby.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 bg-white border border-[#E5EEEC] rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/issue/${g.id}`}
                        target="_blank"
                        className="text-sm font-semibold text-[#0B1F3A] hover:text-[#0EA5A0] block truncate"
                      >
                        {g.title}
                      </Link>
                      <p className="text-xs text-[#94A3B8] capitalize">
                        {g.distanceM} m away · {String(g.status).replace('_', ' ')} · {g.upvotes} supporters
                      </p>
                    </div>
                    {supportedIds.includes(g.id) ? (
                      <span className="text-xs font-semibold text-[#16A34A]">✓ Supported</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSupport(g.id)}
                        className="text-xs font-semibold text-[#0EA5A0] bg-[#F0FDFA] border border-[#CFEFEC] px-3 py-1.5 rounded-full hover:bg-[#E0FBF7] active:scale-95 transition-all"
                      >
                        + Support
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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