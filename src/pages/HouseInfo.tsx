
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../lib/auth';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { ArrowLeft, Wifi, Phone, MapPin, ClipboardCheck, Shield, Copy, Check, Navigation, ExternalLink, Loader2, ImageIcon, CheckCircle2, AlertTriangle } from 'lucide-react';
import { fetchHouseInfo, type HouseInfo } from '../lib/house-info';
import { getLatestCheckoutPhotosByArea, getLatestInspection } from 'zite-endpoints-sdk';
import ProfileAvatar from '../components/ProfileAvatar';

export default function HouseInfo() {
  const nav = useNavigate();
  const [info, setInfo] = useState<HouseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checkoutPhotos, setCheckoutPhotos] = useState<Awaited<ReturnType<typeof getLatestCheckoutPhotosByArea>>['photos']>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [latestInspection, setLatestInspection] = useState<Awaited<ReturnType<typeof getLatestInspection>>['inspection']>(null);
  const [inspectionLoading, setInspectionLoading] = useState(true);

  useEffect(() => {
    fetchHouseInfo().then(s => { setInfo(s); setLoading(false); }).catch(() => setLoading(false));
    getLatestCheckoutPhotosByArea()
      .then(r => setCheckoutPhotos(r.photos))
      .finally(() => setPhotosLoading(false));
    getLatestInspection()
      .then(r => setLatestInspection(r.inspection))
      .finally(() => setInspectionLoading(false));
  }, []);

  const copyPassword = () => {
    if (!info) return;
    navigator.clipboard.writeText(info.wifi.password);
    setCopied(true);
    toast.success('WiFi password copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const openDirections = () => {
    if (!info) return;
    const loc = info.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}&destination_place_id=${encodeURIComponent(loc.label)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <Toaster />
      <div className="w-full max-w-md min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-primary px-6 pt-12 pb-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/5 animate-float-1" />
          <div className="absolute bottom-4 -left-8 w-36 h-36 rounded-full bg-white/5 animate-float-2" />
          <div className="absolute top-20 right-8 w-20 h-20 rounded-full bg-white/5 animate-float-3" />
          <button onClick={() => nav(-1)} className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-4 hover:text-primary-foreground relative z-10">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-primary-foreground text-2xl font-bold relative z-10">House Info</h1>
          <p className="text-primary-foreground/60 text-sm mt-1 relative z-10">Everything about NazVik Farmhouse</p>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 py-5 space-y-4 pb-28">
          {loading || !info ? (
            <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* WiFi */}
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-primary" /> WiFi
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Network</span>
                    <span className="font-semibold text-foreground">{info.wifi.ssid}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Password</span>
                    <button onClick={copyPassword} className="flex items-center gap-1.5 font-semibold text-foreground bg-accent/30 px-2.5 py-1 rounded-lg hover:bg-accent/50 transition-colors">
                      {info.wifi.password}
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Emergency */}
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" /> Emergency Contacts
                </h2>
                <div className="space-y-2">
                  {info.emergency.map(c => (
                    <a key={c.number} href={`tel:${c.number}`} className="flex justify-between items-center text-sm py-1.5 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{c.name}</span>
                      <span className="font-semibold text-primary flex items-center gap-1">
                        {c.number} <ExternalLink className="w-3 h-3" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Directions */}
              <button
                onClick={openDirections}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:opacity-90 transition-opacity"
              >
                <Navigation className="w-4 h-4" /> Get Directions
              </button>

              {/* Latest Farmhouse Update */}
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-primary" /> Latest Farmhouse Update
                </h2>
                {inspectionLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : !latestInspection ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No check-in updates yet</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ProfileAvatar url={latestInspection.avatarUrl} name={latestInspection.familyName} size={24} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{latestInspection.familyName}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(latestInspection.inspectedAt).toLocaleDateString()}</p>
                      </div>
                      {latestInspection.isClean ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600 text-[11px] font-semibold border border-green-200">
                          <CheckCircle2 className="w-3 h-3" /> Clean
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold border border-red-200">
                          <AlertTriangle className="w-3 h-3" /> Issues
                        </span>
                      )}
                    </div>
                    {latestInspection.checklist && info && (
                      <div className="space-y-1.5">
                        {info.checklist.map(item => {
                          const verified = latestInspection.checklist?.[item.id] ?? false;
                          return (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              {verified ? (
                                <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                              ) : (
                                <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground shrink-0" />
                              )}
                              <span className={verified ? 'text-foreground' : 'text-muted-foreground line-through'}>{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {latestInspection.comments && (
                      <div className="p-2.5 rounded-xl bg-accent/30 text-sm text-foreground">
                        <p className="text-[11px] text-muted-foreground font-medium mb-1">Comments</p>
                        {latestInspection.comments}
                      </div>
                    )}
                    {latestInspection.evidencePhotoUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-border">
                        <img src={latestInspection.evidencePhotoUrl} alt="Inspection evidence" className="w-full h-40 object-cover" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* House Rules */}
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> House Rules
                </h2>
                <ul className="space-y-2">
                  {info.rules.map((rule, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Latest Checkout Photos */}
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <h2 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" /> Latest Farmhouse Photos
                </h2>
                <p className="text-xs text-muted-foreground mb-3">Recent checkout photos from each area</p>
                {photosLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : checkoutPhotos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No checkout photos yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {checkoutPhotos.map(photo => (
                      <div key={photo.id} className="space-y-2">
                        <div className="relative aspect-square rounded-xl overflow-hidden border border-border bg-background">
                          <img src={photo.photoUrl} alt={photo.areaName} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ProfileAvatar url={photo.avatarUrl} name={photo.familyName} size={16} />
                          <span className="text-[11px] font-medium text-foreground truncate">{photo.areaName}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">by {photo.familyName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
