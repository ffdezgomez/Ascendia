// src/routes/profile.ts
import { Router } from 'express';
import User from '../models/user.js';
import Profile from '../models/profile.js';
import Avatar from '../models/avatar.js';
import multer, { memoryStorage } from 'multer';

const r = Router();

/**
 * Middleware simple para exigir autenticación.
 * Usa req.session.user que rellenas en index.ts a partir del JWT.
 */
function requireAuth(req: any, res: any, next: any) {
  const sessionUser = req.session?.user;
  if (!sessionUser || !sessionUser.userId) {
    return res.status(401).json({ error: 'No autenticicado' });
  }
  req.currentUserId = sessionUser.userId;
  next();
}

/* =========================================================================
   Configuración subida de avatar (multer) -> MEMORIA
   ========================================================================= */
const storage = memoryStorage(); // Guardamos en buffer, no en disco

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

/* =========================================================================
   GET /profile/avatar/:userId  → Servir imagen desde BD
   ========================================================================= */
r.get('/profile/avatar/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const avatar = await Avatar.findOne({ user: userId });

    if (!avatar || !avatar.data) {
      // Redirigir a placeholder o devolver 404
      return res.redirect('https://ui-avatars.com/api/?name=User&background=random');
    }

    res.set('Content-Type', avatar.contentType);
    res.send(avatar.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving avatar');
  }
});

// A partir de aquí, todas las rutas de este router exigen login
r.use(requireAuth);

/* =========================================================================
   GET /profile  → devuelve el perfil del usuario autenticado
   (desde el punto de vista del proxy y el front es /api/profile)
   ========================================================================= */
r.get('/profile', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    let profile = await Profile.findOne({ user: user._id });
    if (!profile) {
      profile = await Profile.create({
        user: user._id as any,
        avatar: '',
        bio: '',
        habits: [],
        stats: { readingHours: 0, workoutHours: 0, streak: 0 },
      });
    }

    if (!user.profile || String(user.profile) !== String(profile._id)) {
      user.profile = profile._id as any;
      await user.save();
    }

    res.json({
      user: user.username,
      email: user.email,
      avatar: profile.avatar ?? '',
      bio: profile.bio ?? '',
      habits: profile.habits ?? [],
      stats: profile.stats ?? { readingHours: 0, workoutHours: 0, streak: 0 },
    });
  } catch (err) {
    next(err);
  }
});

/* =========================================================================
   PUT /profile  → actualiza nombre, avatar (url) y bio
   ========================================================================= */
r.put('/profile', async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId;
    const { user, avatar, bio, habits } = req.body ?? {};

    // Actualizar username si viene
    const dbUser = await User.findByIdAndUpdate(
      userId,
      user ? { $set: { username: user } } : {},
      { new: true }
    );
    if (!dbUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Buscar/crear profile
    let profile = await Profile.findOne({ user: dbUser._id });
    if (!profile) {
      profile = await Profile.create({
        user: dbUser._id as any,
        avatar: avatar ?? '',
        bio: bio ?? '',
        habits: Array.isArray(habits) ? habits : [],
        stats: { readingHours: 0, workoutHours: 0, streak: 0 },
      });
    } else {
      if (avatar !== undefined) profile.avatar = avatar;
      if (bio !== undefined) profile.bio = bio;
      if (Array.isArray(habits)) profile.habits = habits;
      await profile.save();
    }

    if (!dbUser.profile || String(dbUser.profile) !== String(profile._id)) {
      dbUser.profile = profile._id as any;
      await dbUser.save();
    }

    res.json({
      user: dbUser.username,
      email: dbUser.email,
      avatar: profile.avatar ?? '',
      bio: profile.bio ?? '',
      habits: profile.habits ?? [],
      stats: profile.stats ?? { readingHours: 0, workoutHours: 0, streak: 0 },
    });
  } catch (err) {
    next(err);
  }
})

/* =========================================================================
   POST /profile/avatar  → subir nueva imagen de avatar a BD
   ========================================================================= */
r.post('/profile/avatar', upload.single('avatar'), async (req: any, res: any, next: any) => {
  try {
    const userId = req.currentUserId;

    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ningún archivo' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Guardar en colección Avatar
    await Avatar.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        data: req.file.buffer,
        contentType: req.file.mimetype
      },
      { upsert: true, new: true }
    );

    // URL para servir la imagen con timestamp para evitar caché
    const avatarUrl = `/api/profile/avatar/${userId}?t=${Date.now()}`;

    let profile = await Profile.findOne({ user: user._id });
    if (!profile) {
      profile = await Profile.create({
        user: user._id as any,
        avatar: avatarUrl,
        bio: '',
        habits: [],
        stats: { readingHours: 0, workoutHours: 0, streak: 0 },
      });
    } else {
      profile.avatar = avatarUrl;
      await profile.save();
    }

    if (!user.profile || String(user.profile) !== String(profile._id)) {
      user.profile = profile._id as any;
      await user.save();
    }

    res.json({
      user: user.username,
      email: user.email,
      avatar: profile.avatar ?? '',
      bio: profile.bio ?? '',
      habits: profile.habits ?? [],
      stats: profile.stats ?? { readingHours: 0, workoutHours: 0, streak: 0 },
    });
  } catch (err) {
    next(err);
  }
});

export default r;