'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Save, Camera, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AvatarCropModal } from '@/components/ui/avatar-crop-modal';
import { toast } from 'sonner';
import api from '@/lib/api';
import { passwordSchema } from '@/lib/auth-schemas';
import { useAuthStore } from '@/stores/auth.store';

interface ProfileForm {
  name: string;
  bio: string;
}

const emailSchema = z.object({
  newEmail: z.string().email('Adresa de email nu este validă'),
  currentPassword: z.string().optional(),
});
type EmailForm = z.infer<typeof emailSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Parola curentă este obligatorie'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Parolele nu coincid',
  path: ['confirmPassword'],
});
type PasswordForm = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const { user, fetchMe, isHydrated } = useAuthStore();
  const router = useRouter();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) router.push('/login?from=/profile');
  }, [user, isHydrated]);

  // Revoke object URL on unmount to avoid memory leak
  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const profileForm = useForm<ProfileForm>({
    mode: 'onBlur',
    defaultValues: { name: user?.name ?? '', bio: '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  useEffect(() => {
    if (!user) return;
    api.get('/users/me').then((r) => {
      profileForm.reset({ name: r.data.name ?? '', bio: r.data.bio ?? '' });
      setAvatarPreview(r.data.avatar ?? null);
    });
  }, [user?._id]);

  async function onSaveProfile(data: ProfileForm) {
    setSavingProfile(true);
    try {
      await api.patch('/users/me', { name: data.name.trim(), bio: data.bio || undefined });
      await fetchMe();
      toast.success('Profilul a fost actualizat');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg ?? 'Eroare la salvarea profilului');
    } finally {
      setSavingProfile(false);
    }
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const isHeic = /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
    if (isHeic) {
      // Convertim HEIC → JPEG client-side ca să putem afișa în cropper
      setUploadingAvatar(true);
      try {
        const heic2any = (await import('heic2any')).default;
        const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        const url = URL.createObjectURL(blob);
        setCropSrc(url);
      } catch {
        toast.error('Nu s-a putut procesa fișierul HEIC');
      } finally {
        setUploadingAvatar(false);
      }
      return;
    }

    const url = URL.createObjectURL(file);
    setCropSrc(url);
  }

  async function uploadAvatarBlob(blobOrFile: Blob, filename = 'avatar.jpg') {
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', blobOrFile, filename);
      const { data } = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatarPreview(data.avatar);
      await fetchMe();
      toast.success('Poza de profil a fost actualizată');
    } catch {
      setAvatarPreview(user?.avatar ?? null);
      toast.error('Eroare la încărcarea pozei');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleCropConfirm(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    const preview = URL.createObjectURL(blob);
    setAvatarPreview(preview);
    setCropSrc(null);
    uploadAvatarBlob(blob);
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function onChangePassword(data: PasswordForm) {
    setSavingPassword(true);
    try {
      await api.patch('/users/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Parola a fost schimbată');
      passwordForm.reset();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Eroare la schimbarea parolei';
      toast.error(msg);
    } finally {
      setSavingPassword(false);
    }
  }

  async function onChangeEmail(data: EmailForm) {
    setSavingEmail(true);
    try {
      await api.post('/users/me/email', {
        newEmail: data.newEmail,
        currentPassword: data.currentPassword || undefined,
      });
      setEmailSent(true);
      setShowEmailForm(false);
      emailForm.reset();
      toast.success('Email de confirmare trimis la adresa ta curentă');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Eroare la schimbarea email-ului';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSavingEmail(false);
    }
  }

  if (!user) return null;

  const displayAvatar = avatarPreview ?? user.avatar ?? '';

  return (
    <>
      <AvatarCropModal
        open={!!cropSrc}
        imageSrc={cropSrc ?? ''}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />

      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-8">Profilul meu</h1>

        {/* Profile info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Informații personale</h2>
          </div>

          {/* Avatar upload */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative group">
              <Avatar className="h-16 w-16">
                <AvatarImage src={displayAvatar} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xl font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                aria-label="Schimbă poza de profil"
              >
                {uploadingAvatar ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={onAvatarChange}
              />
            </div>

            <div className="text-sm text-gray-500">
              <p className="font-medium text-gray-700">{user.name}</p>
              <p>{user.email}</p>
              <p className="text-blue-600">
                {user.role === 'student' ? 'Student' : user.role === 'instructor' ? 'Formator' : user.role === 'admin' ? 'Admin' : user.role}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Click pe poză pentru a o schimba · max 5 MB</p>
            </div>
          </div>

          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
            <div>
              <Label htmlFor="name">Nume</Label>
              <Input
                id="name"
                maxLength={50}
                {...profileForm.register('name', {
                  required: 'Numele este obligatoriu',
                  validate: (raw) => {
                    const v = raw.trim();
                    if (v.length < 2) return 'Numele trebuie să aibă minim 2 caractere';
                    if (v.length > 50) return 'Numele poate avea maxim 50 de caractere';
                    if (/\s{2,}/.test(v)) return 'Numele nu poate conține spații consecutive';
                    if (!/^[A-Za-zÀ-ÖØ-öø-ÿăîâșțĂÎÂȘȚ]+([- ][A-Za-zÀ-ÖØ-öø-ÿăîâșțĂÎÂȘȚ]+)*$/.test(v))
                      return 'Numele poate conține doar litere, spații și cratimă (ex: Ion Popescu)';
                    return true;
                  },
                })}
                className="mt-1"
              />
              {profileForm.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1.5 font-medium">{profileForm.formState.errors.name.message}</p>
              )}
            </div>

            {(user.role === 'instructor' || user.role === 'admin') && (
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Câteva cuvinte despre tine, experiența ta..."
                  rows={3}
                  {...profileForm.register('bio')}
                  className="mt-1"
                />
              </div>
            )}

            <Button type="submit" disabled={savingProfile} className="gap-1.5">
              <Save className="w-4 h-4" />
              {savingProfile ? 'Se salvează...' : 'Salvează profilul'}
            </Button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Schimbă parola</h2>
          </div>

          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Parola curentă</Label>
              <Input
                id="currentPassword"
                type="password"
                {...passwordForm.register('currentPassword')}
                className="mt-1"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="newPassword">Parola nouă</Label>
              <Input
                id="newPassword"
                type="password"
                {...passwordForm.register('newPassword')}
                className="mt-1"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmă parola nouă</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...passwordForm.register('confirmPassword')}
                className="mt-1"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" disabled={savingPassword} variant="outline" className="gap-1.5">
              <Lock className="w-4 h-4" />
              {savingPassword ? 'Se schimbă...' : 'Schimbă parola'}
            </Button>
          </form>
        </div>

        {/* Change email */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mt-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-800">Schimbă adresa de email</h2>
            </div>
            {!showEmailForm && !emailSent && (
              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Modifică
              </button>
            )}
          </div>

          {emailSent ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              Un email de confirmare a fost trimis la <strong>{user.email}</strong>. Urmează instrucțiunile din email pentru a finaliza schimbarea.
            </div>
          ) : showEmailForm ? (
            <form onSubmit={emailForm.handleSubmit(onChangeEmail)} className="space-y-4">
              <div>
                <Label htmlFor="newEmail">Adresa nouă de email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  placeholder="adresa@noua.com"
                  {...emailForm.register('newEmail')}
                  className="mt-1"
                />
                {emailForm.formState.errors.newEmail && (
                  <p className="text-xs text-red-500 mt-1">{emailForm.formState.errors.newEmail.message}</p>
                )}
              </div>

              {user.hasPassword !== false && (
                <div>
                  <Label htmlFor="emailCurrentPassword">Parola curentă</Label>
                  <Input
                    id="emailCurrentPassword"
                    type="password"
                    placeholder="Confirmă identitatea cu parola ta"
                    {...emailForm.register('currentPassword')}
                    className="mt-1"
                  />
                  {emailForm.formState.errors.currentPassword && (
                    <p className="text-xs text-red-500 mt-1">{emailForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500">
                Vei primi un email de confirmare la adresa curentă (<strong>{user.email}</strong>), iar apoi un al doilea email la noua adresă.
              </p>

              <div className="flex gap-2">
                <Button type="submit" disabled={savingEmail} className="gap-1.5">
                  <Mail className="w-4 h-4" />
                  {savingEmail ? 'Se trimite...' : 'Trimite confirmarea'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowEmailForm(false); emailForm.reset(); }}
                >
                  Anulează
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-gray-500">
              Adresa curentă: <strong className="text-gray-700">{user.email}</strong>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
