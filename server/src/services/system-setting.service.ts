import prisma from '../config/db';

const SETTINGS_ROW_ID = 1;

export class SystemSettingService {
    async getSettings() {
        const rows = await prisma.$queryRaw<Array<{
            allow_multiple_attempts: boolean;
            enforce_exam_single_tab: boolean;
            tab_switch_grace_seconds: number;
            updated_at: Date;
        }>>`
            SELECT allow_multiple_attempts, enforce_exam_single_tab, tab_switch_grace_seconds, updated_at
            FROM system_settings
            WHERE id = ${SETTINGS_ROW_ID}
            LIMIT 1
        `;

        if (rows.length === 0) {
            await prisma.$executeRaw`
                INSERT INTO system_settings (id, allow_multiple_attempts, enforce_exam_single_tab, tab_switch_grace_seconds, created_at, updated_at)
                VALUES (${SETTINGS_ROW_ID}, false, false, 5, NOW(), NOW())
                ON CONFLICT (id) DO NOTHING
            `;

            return {
                allowMultipleAttempts: false,
                enforceExamSingleTab: false,
                tabSwitchGraceSeconds: 5,
                updatedAt: new Date(),
            };
        }

        return {
            allowMultipleAttempts: Boolean(rows[0].allow_multiple_attempts),
            enforceExamSingleTab: Boolean(rows[0].enforce_exam_single_tab),
            tabSwitchGraceSeconds: Math.max(1, Math.min(30, Math.round(Number(rows[0].tab_switch_grace_seconds || 5)))),
            updatedAt: rows[0].updated_at,
        };
    }

    async updateSettings(data: { allowMultipleAttempts: boolean; enforceExamSingleTab: boolean; tabSwitchGraceSeconds: number }) {
        const safeTabSwitchGraceSeconds = Math.max(1, Math.min(30, Math.round(Number(data.tabSwitchGraceSeconds || 5))));

        await prisma.$executeRaw`
            INSERT INTO system_settings (id, allow_multiple_attempts, enforce_exam_single_tab, tab_switch_grace_seconds, created_at, updated_at)
            VALUES (${SETTINGS_ROW_ID}, ${data.allowMultipleAttempts}, ${data.enforceExamSingleTab}, ${safeTabSwitchGraceSeconds}, NOW(), NOW())
            ON CONFLICT (id)
            DO UPDATE SET
                allow_multiple_attempts = EXCLUDED.allow_multiple_attempts,
                enforce_exam_single_tab = EXCLUDED.enforce_exam_single_tab,
                tab_switch_grace_seconds = EXCLUDED.tab_switch_grace_seconds,
                updated_at = NOW()
        `;

        const rows = await prisma.$queryRaw<Array<{
            allow_multiple_attempts: boolean;
            enforce_exam_single_tab: boolean;
            tab_switch_grace_seconds: number;
            updated_at: Date;
        }>>`
            SELECT allow_multiple_attempts, enforce_exam_single_tab, tab_switch_grace_seconds, updated_at
            FROM system_settings
            WHERE id = ${SETTINGS_ROW_ID}
            LIMIT 1
        `;

        const row = rows[0];

        return {
            allowMultipleAttempts: Boolean(row?.allow_multiple_attempts),
            enforceExamSingleTab: Boolean(row?.enforce_exam_single_tab),
            tabSwitchGraceSeconds: Math.max(1, Math.min(30, Math.round(Number(row?.tab_switch_grace_seconds || 5)))),
            updatedAt: row?.updated_at || new Date(),
        };
    }
}

export const systemSettingService = new SystemSettingService();
