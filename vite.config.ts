import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          login: path.resolve(__dirname, 'login.html'),
          register: path.resolve(__dirname, 'register.html'),
          registerContractor: path.resolve(__dirname, 'register-contractor.html'),
          registerCompany: path.resolve(__dirname, 'register-company.html'),
          dashboardContractor: path.resolve(__dirname, 'dashboard-contractor.html'),
          dashboardCompany: path.resolve(__dirname, 'dashboard-company.html'),
          browseContractors: path.resolve(__dirname, 'browse-contractors.html'),
          browseWork: path.resolve(__dirname, 'browse-work.html'),
          postWork: path.resolve(__dirname, 'post-work.html'),
          profileContractor: path.resolve(__dirname, 'profile-contractor.html'),
          profileCompany: path.resolve(__dirname, 'profile-company.html'),
          myProfile: path.resolve(__dirname, 'my-profile.html'),
          admin: path.resolve(__dirname, 'admin.html'),
          onboardingContractor: path.resolve(__dirname, 'onboarding-contractor.html'),
          onboardingCompany: path.resolve(__dirname, 'onboarding-company.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
