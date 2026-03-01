import prisma from '../config/db';

const SETTINGS_ROW_ID = 1;

export class SystemSettingService {
    async getSettings() {
        const rows = await prisma.$queryRaw<Array<{ allow_multiple_attempts: boolean; updated_at: Date }>>`
            SELECT allow_multiple_attempts, updated_at
            FROM system_settings
            WHERE id = ${SETTINGS_ROW_ID}
            LIMIT 1
        `;

        if (rows.length === 0) {
            await prisma.$executeRaw`
                INSERT INTO system_settings (id, allow_multiple_attempts)
                VALUES (${SETTINGS_ROW_ID}, false)
                ON CONFLICT (id) DO NOTHING
            `;

            return {
                allowMultipleAttempts: false,
                updatedAt: new Date(),
            };
        }

        return {
            allowMultipleAttempts: Boolean(rows[0].allow_multiple_attempts),
            updatedAt: rows[0].updated_at,
        };
    }

    async updateSettings(data: { allowMultipleAttempts: boolean }) {
        await prisma.$executeRaw`
            INSERT INTO system_settings (id, allow_multiple_attempts)
            VALUES (${SETTINGS_ROW_ID}, ${data.allowMultipleAttempts})
            ON CONFLICT (id)
            DO UPDATE SET
                allow_multiple_attempts = EXCLUDED.allow_multiple_attempts,
                updated_at = NOW()
        `;

        const rows = await prisma.$queryRaw<Array<{ allow_multiple_attempts: boolean; updated_at: Date }>>`
            SELECT allow_multiple_attempts, updated_at
            FROM system_settings
            WHERE id = ${SETTINGS_ROW_ID}
            LIMIT 1
        `;

        const row = rows[0];

        return {
            allowMultipleAttempts: Boolean(row?.allow_multiple_attempts),
            updatedAt: row?.updated_at || new Date(),
        };
    }
}

export const systemSettingService = new SystemSettingService();
