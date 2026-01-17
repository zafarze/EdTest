// src/types/index.ts

// --- Auth ---
export interface User {
	id: number;
	username: string;
	email: string;
	first_name?: string;
	last_name?: string;
}

export interface AuthResponse {
	access: string; // JWT Access Token
	refresh: string; // JWT Refresh Token
}

// --- Domain Models ---
export interface School {
	id: number;
	name: string;
	address: string;
}

export interface ExamVariant {
	id: number;
	variant_code: string; // "A", "B"...
	exam: number; // ID экзамена
}

// --- OMR / Scanner ---
export interface ScanResult {
	id: number;
	student: {
		id: number;
		full_name: string;
		student_id: string;
	};
	exam_variant: string; // Например "GAT-1 (Var A)"
	score: number;
	scanned_image: string; // URL картинки
	recognized_answers: Record<string, string>; // {"1": "A", "2": "B"}
	is_checked: boolean;
	created_at: string;
}