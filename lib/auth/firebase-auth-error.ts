export function getFirebaseAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Terjadi kesalahan autentikasi.";
  }

  const message = error.message;

  if (message.includes("auth/invalid-credential")) {
    return "Email atau password tidak valid.";
  }

  if (message.includes("auth/user-not-found")) {
    return "User tidak ditemukan.";
  }

  if (message.includes("auth/wrong-password")) {
    return "Password lama tidak valid.";
  }

  if (message.includes("auth/weak-password")) {
    return "Password baru terlalu lemah. Gunakan minimal 6 karakter.";
  }

  if (message.includes("auth/requires-recent-login")) {
    return "Sesi login perlu diperbarui. Silakan logout lalu login ulang.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.";
  }

  return message;
}
