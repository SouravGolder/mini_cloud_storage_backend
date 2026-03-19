const db = require('../db');

const MAX_STORAGE = 500 * 1024 * 1024; // 500 MB

//upload file
exports.uploadFile = async (req, res) => {
    const { user_id } = req.params;
    const { file_name, file_size, file_hash } = req.body;

    if (!file_name || !file_size || !file_hash) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.transaction(async trx => {

            //check storage used by the user
            const storage = await trx('user_files')
                .join('files', 'user_files.file_id', 'files.id')
                .where('user_id', user_id)
                .sum('files.file_size as used')
                .forUpdate();
            const used = parseInt(storage[0].used || 0);

            if (used + file_size > MAX_STORAGE) {
                throw new Error('Storage limit exceeded');
            }

            //check duplicate filename for the same user
            const existing = await trx('user_files')
                .where({ user_id, file_name })
                .first();
            if (existing) {
                throw new Error('File name already exists');
            }

            //check if file with same hash exists
            let file = await trx('files').where({ file_hash }).first();
            if (!file) {
                const [file_id] = await trx('files')
                    .insert({ file_size, file_hash })
                    .returning('id');
                file = { id: file_id };
            }
            //insert into user_files
            const [user_file_id] = await trx('user_files').insert({ user_id, file_id: file.id, file_name }).returning('id');
            res.json({ message: 'File uploaded successfully', user_file_id: user_file_id});
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

//delete file
exports.deleteFile = async (req, res) => {
    const { user_id, file_id } = req.params;

    try {
        await db.transaction(async trx => {
            const file = await trx('user_files')
                .join('files', 'user_files.file_id', 'files.id')
                .where({ 'user_files.id': file_id, 'user_files.user_id': user_id })
                .select('files.id as file_id')
                .first()
        
            if (!file) { throw new Error('File not found'); }

            await trx('user_files').where({ id: file_id }).del();

            // Check if file is still used
            const usage = await trx('user_files')
                .where({ file_id: file.file_id })
                .count('id as count')
                .first();

            if (usage.count == 0) {
                await trx('files')
                    .where({ id: file.file_id })
                    .del();
            }
        });
        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Storage Summary
exports.StorageSummary = async (req, res) => {
    const { user_id } = req.params;
    try {
        const summary = await db('user_files')
            .join('files', 'user_files.file_id', 'files.id')
            .where('user_files.user_id', user_id)
            .sum('files.file_size as total_used')
            .count('user_files.id as total_files')
            .first();

        const total_used = parseInt(summary.total_used || 0);
        const remaining = MAX_STORAGE - total_used;

        res.json({
            total_used,
            remaining,
            total_files: parseInt(summary.total_files)
        });
    }catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// List User Files
exports.getUserFiles = async (req, res) => {
    const { user_id } = req.params;
    try {
        const files = await db('user_files')
            .join('files', 'user_files.file_id', 'files.id')
            .where('user_files.user_id', user_id)
            .select('user_files.id as user_file_id', 'user_files.file_name', 'files.file_size', 'user_files.upload_time');

        res.json({ files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};