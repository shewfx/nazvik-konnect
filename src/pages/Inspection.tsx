
import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSession } from '../lib/auth';
import { submitInspection } from 'zite-endpoints-sdk';
import { uploadFile } from 'zite-file-upload-sdk';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertTriangle, ArrowLeft, Loader2, Camera, X, Check } from 'lucide-react';
import { fetchHouseInfo, type HouseInfo } from '../lib/house-info';

export default function Inspection() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isClean, setIsClean] = useState<boolean | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [checklist, setChecklist] = useState<HouseInfo['checklist']>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const session = getSession();
  if (!session) return null;
  const bookingId = searchParams.get('bookingId') ?? '';

  useEffect(() => {
    if (!bookingId) nav('/upcoming');
    fetchHouseInfo().then(info => setChecklist(info.checklist));
  }, [bookingId]);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const { fileUrl } = await uploadFile({ data: file, filename: file.name });
      setPhotoUrl(fileUrl);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = () => {
    setPhotoUrl('');
    setPhotoPreview('');
  };

  const toggleCheck = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (isClean === null) { toast.error('Please select the house condition'); return; }
    setLoading(true);
    try {
      const checklistRecord: Record<string, boolean> = {};
      checklist.forEach(item => { checklistRecord[item.id] = checked.has(item.id); });
      const res = await submitInspection({
        bookingId,
        inspectorFamilyId: session.familyId,
        isClean,
        evidencePhotoUrl: photoUrl || undefined,
        comments: comments || undefined,
        checklist: checklistRecord,
      });
      if (res.success) { setDone(true); toast.success(res.message); }
    } catch { toast.error('Failed to submit inspection'); }
    finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-20 h-20 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Inspection Submitted!</h2>
          <p className="text-muted-foreground">Your check-in report has been recorded.</p>
          <Button onClick={() => nav('/upcoming')} className="mt-4">Back to Trips</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <Toaster />
      <div className="w-full max-w-md min-h-screen flex flex-col">
        <div className="bg-primary px-6 pt-12 pb-6">
          <button onClick={() => nav(-1)} className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-primary-foreground text-2xl font-bold">Check-In Inspection 🏡</h1>
          <p className="text-primary-foreground/60 text-sm mt-1">Report the farmhouse condition on arrival</p>
        </div>

        <div className="flex-1 px-4 py-6 space-y-6">
          {/* Arrival Checklist */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">Arrival Checklist — Tick as you verify</Label>
            <p className="text-xs text-muted-foreground mb-3">Verify these items before submitting your inspection</p>
            <div className="space-y-2">
              {checklist.map(item => (
                <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${checked.has(item.id) ? 'bg-primary border-primary' : 'border-border bg-background group-hover:border-primary/40'}`}>
                    {checked.has(item.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                  </span>
                  <input type="checkbox" className="sr-only" checked={checked.has(item.id)} onChange={() => toggleCheck(item.id)} />
                  <span className={`text-sm ${checked.has(item.id) ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700 font-medium">{checked.size}/{checklist.length} verified</p>
            </div>
          </div>

          {/* Condition toggle */}
          <div>
            <Label className="text-sm font-semibold text-foreground mb-3 block">How did you find the farmhouse?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsClean(true)}
                className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${isClean === true ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
              >
                <CheckCircle2 className={`w-8 h-8 ${isClean === true ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-semibold text-sm">Clean ✨</span>
                <span className="text-xs text-muted-foreground text-center">House was left tidy</span>
              </button>
              <button
                onClick={() => setIsClean(false)}
                className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${isClean === false ? 'border-destructive bg-destructive/5' : 'border-border bg-card'}`}
              >
                <AlertTriangle className={`w-8 h-8 ${isClean === false ? 'text-destructive' : 'text-muted-foreground'}`} />
                <span className="font-semibold text-sm">Dirty 🧹</span>
                <span className="text-xs text-muted-foreground text-center">Found it messy</span>
              </button>
            </div>
            {isClean === false && (
              <div className="mt-3 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                <p className="text-xs text-destructive font-medium">⚠️ Reporting dirty will deduct 5 pts from the previous family.</p>
              </div>
            )}
          </div>

          {/* Evidence photo — camera only */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground block">Evidence Photo</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleCapture}
            />
            {!photoPreview ? (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-border bg-card hover:border-primary/40 transition-colors"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Camera className="w-5 h-5 text-primary" />}
                <span className="text-sm font-medium text-muted-foreground">{uploading ? 'Uploading...' : 'Take Photo'}</span>
              </button>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-border">
                <img src={photoPreview} alt="Evidence" className="w-full h-48 object-cover" />
                <button
                  onClick={removePhoto}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comments (optional)</Label>
            <Textarea id="comments" placeholder="Describe the condition..." value={comments} onChange={e => setComments(e.target.value)} className="rounded-xl" rows={3} />
          </div>

          <Button onClick={handleSubmit} disabled={loading || isClean === null} className="w-full rounded-2xl h-12 font-bold">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Submit Inspection
          </Button>
        </div>
      </div>
    </div>
  );
}
