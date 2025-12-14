import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { connectDB } from '../db/mongoose.js';
import Avatar from '../models/avatar.js';
import Profile from '../models/profile.js';
import User from '../models/user.js';
import mongoose from 'mongoose';

async function migrate() {
    console.log('Conectando a MongoDB...');
    await connectDB();
    console.log('Conectado.');

    const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');

    if (!fs.existsSync(uploadsDir)) {
        console.log('No existe el directorio uploads/avatars. Nada que migrar.');
        process.exit(0);
    }

    const files = fs.readdirSync(uploadsDir);
    console.log(`Encontrados ${files.length} archivos en ${uploadsDir}`);

    for (const file of files) {
        if (file === '.gitkeep') continue;

        // Formato esperado: userId-timestamp.ext
        // Ejemplo: 67488c...-17329...jpg
        const userId = file.split('-')[0];

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.warn(`Archivo ${file} no tiene un userId válido. Saltando.`);
            continue;
        }

        const filePath = path.join(uploadsDir, file);
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(file).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

        console.log(`Migrando avatar para usuario ${userId}...`);

        try {
            // 1. Guardar en colección Avatars
            await Avatar.findOneAndUpdate(
                { user: userId },
                {
                    user: userId,
                    data: buffer,
                    contentType
                },
                { upsert: true, new: true }
            );

            // 2. Actualizar Profile con la nueva URL
            // La URL será relativa: /api/profile/avatar/view/<userId>
            // Ojo: en el frontend se usa tal cual viene.
            const newUrl = `/api/profile/avatar/${userId}`;

            await Profile.findOneAndUpdate(
                { user: userId },
                { avatar: newUrl }
            );

            console.log(`✅ Migrado ${file}`);
        } catch (err) {
            console.error(`❌ Error migrando ${file}:`, err);
        }
    }

    console.log('Migración completada.');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
