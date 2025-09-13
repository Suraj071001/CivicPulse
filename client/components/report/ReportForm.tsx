import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useReports } from "@/store/reports";
import { Camera, Mic, MapPin, StopCircle, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReportCategory } from "@shared/api";

export const ReportForm: React.FC = () => {
  const { addReport } = useReports();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReportCategory>("pothole");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [urgency, setUrgency] = useState<"low" | "medium" | "high">("medium");
  const [loc, setLoc] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // MediaRecorder
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recError, setRecError] = useState<string | null>(null);

  const canSubmit = useMemo(() => description.trim().length > 0 || photoUrl || audioUrl, [description, photoUrl, audioUrl]);

  const onPickPhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setPhotoFile(f);
  }, []);

  const startRecording = useCallback(async () => {
    setRecError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setAudioFile(new File([blob], `voice-${Date.now()}.webm`));
        chunksRef.current = [];
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      setRecError("Microphone unavailable");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      await addReport({ description, category, urgency, photoFile, audioFile, location: loc ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy ?? null, address: null } : null });
      setDescription("");
      setAudioUrl(null);
      setAudioFile(null);
      setPhotoUrl(null);
      setPhotoFile(null);
    },
    [addReport, audioFile, canSubmit, category, description, loc, photoFile, urgency],
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-xl p-4 bg-card border">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold">New Report</div>
            <div className="text-xs text-muted-foreground">Capture photo, add notes or voice</div>
          </div>
          <span className={cn("text-xs px-2 py-1 rounded-full capitalize", urgency === "high" && "bg-red-100 text-red-700", urgency === "medium" && "bg-amber-100 text-amber-700", urgency === "low" && "bg-emerald-100 text-emerald-700")}>{urgency}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Category</div>
            <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pothole">Pothole</SelectItem>
                <SelectItem value="streetlight">Streetlight</SelectItem>
                <SelectItem value="trash">Trash</SelectItem>
                <SelectItem value="graffiti">Graffiti</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <label className="col-span-2 cursor-pointer rounded-lg border-2 border-dashed hover:border-primary/50 p-3 flex items-center gap-3">
            <input type="file" accept="image/*" capture="environment" onChange={onPickPhoto} className="hidden" />
            <Camera className="h-5 w-5 text-primary" />
            <span className="text-sm">Add photo</span>
          </label>
          <button
            type="button"
            className={cn("rounded-lg p-3 border flex items-center justify-center gap-2", recording ? "bg-red-50 border-red-200" : "hover:border-primary/50")}
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? <StopCircle className="h-5 w-5 text-red-600" /> : <Mic className="h-5 w-5 text-primary" />}
            <span className="text-sm">{recording ? "Stop" : "Voice"}</span>
          </button>
        </div>

        {recError ? <div className="text-xs text-destructive mt-2">{recError}</div> : null}

        {photoUrl ? (
          <div className="mt-3">
            <img src={photoUrl} alt="preview" className="rounded-lg w-full max-h-64 object-cover" />
          </div>
        ) : null}

        {audioUrl ? (
          <div className="mt-3">
            <audio controls className="w-full">
              <source src={audioUrl} />
            </audio>
          </div>
        ) : null}

        <div className="mt-3">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue..." className="min-h-[96px]" />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={getLocation} className="shrink-0">
            {locLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}<span className="ml-2">Use my location</span>
          </Button>
          <UrgencyPicker value={urgency} onChange={setUrgency} />
        </div>

        {loc ? (
          <div className="mt-2 text-xs text-muted-foreground">
            Location set ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}) {loc.accuracy ? `±${Math.round(loc.accuracy)}m` : ""}
          </div>
        ) : null}
      </div>

      <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
        Submit report
      </Button>
    </form>
  );
};

function UrgencyPicker({ value, onChange }: { value: "low" | "medium" | "high"; onChange: (v: "low" | "medium" | "high") => void }) {
  return (
    <div className="ml-auto inline-flex rounded-full border p-1 bg-background">
      {([
        { v: "low", label: "Low" },
        { v: "medium", label: "Med" },
        { v: "high", label: "High" },
      ] as const).map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "px-3 py-1 text-xs rounded-full transition-colors",
            value === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
