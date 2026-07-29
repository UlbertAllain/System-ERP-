export function getFirebaseAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Terjadi kesalahan autentikasi. Silakan coba kembali.";
  }

  const message = error.message;

  if (
    message.includes("auth/invalid-credential") ||
    message.includes("auth/user-not-found") ||
    message.includes("auth/wrong-password")
  ) {
    return "Email atau password tidak valid.";
  }

  if (message.includes("auth/invalid-email")) {
    return "Format email tidak valid.";
  }

  if (message.includes("auth/user-disabled")) {
    return "Akun ini sedang dinonaktifkan. Hubungi administrator.";
  }

  if (message.includes("auth/weak-password")) {
    return "Password belum memenuhi kebijakan keamanan sistem.";
  }

  if (message.includes("auth/requires-recent-login")) {
    return "Sesi login perlu diperbarui. Silakan keluar lalu masuk kembali.";
  }

  if (message.includes("auth/too-many-requests")) {
    return "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba kembali.";
  }

  if (message.includes("auth/network-request-failed")) {
    return "Koneksi ke layanan autentikasi gagal. Periksa jaringan lalu coba kembali.";
  }

  console.error("[firebase-auth]", error);
  return "Terjadi kesalahan autentikasi. Silakan coba kembali.";
}
