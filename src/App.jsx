import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './features/auth/presentation/context/AuthContext';
import SideNav from './components/layout/SideNav';
import HomePage from './features/series/presentation/pages/HomePage';
import SeriesDetailPage from './features/series/presentation/pages/SeriesDetailPage';
import ReaderPage from './features/series/presentation/pages/ReaderPage';
import SearchModal from './features/series/presentation/components/SearchModal';
import BookLogin from './features/auth/presentation/components/BookLogin/BookLogin';
import { useSeries } from './features/series/presentation/hooks/useSeries';

import './styles/olympus.css';
import './styles/library.css';
import './styles/skeuomorphic.css';


function MainApp() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'series' | 'reader'
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);


  const {
    seriesList,
    featuredSeries,
    currentSeries,
    currentChapterNum,
    setCurrentChapterNum,
    comments,
    isLiked,
    isFollowing,
    selectSeries,
    publishComment,
    toggleLike,
    toggleFollow,
    searchSeries,
  } = useSeries();

  const handleOpenSeries = async (id) => {
    await selectSeries(id);
    setCurrentView('series');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReader = (chapterNum) => {
    setCurrentChapterNum(chapterNum);
    setCurrentView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevChapter = () => {
    if (!currentSeries) return;
    if (currentChapterNum > 1) {
      handleOpenReader(currentChapterNum - 1);
    } else {
      alert('Este es el primer capítulo de la serie.');
    }
  };

  const handleNextChapter = () => {
    if (!currentSeries) return;
    if (currentChapterNum < currentSeries.totalChapters) {
      handleOpenReader(currentChapterNum + 1);
    } else {
      alert('¡Has alcanzado el capítulo más reciente!');
    }
  };

  return (
    <div className="app-shell">
      {/* Navegación lateral (escritorio) */}
      <SideNav
        currentView={currentView}
        onGoHome={() => {
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onGoLibrary={() => {
          if (currentSeries) {
            setCurrentView('series');
          } else {
            handleOpenSeries(0);
          }
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      <div className="app-main">
      {/* Contenido Principal */}
      <main className="main-content">
        {currentView === 'home' && (
          <HomePage
            seriesList={seriesList}
            featuredSeries={featuredSeries}
            onOpenSearch={() => setIsSearchOpen(true)}
            onSelectSeries={handleOpenSeries}
          />
        )}

        {currentView === 'series' && currentSeries && (
          <SeriesDetailPage
            series={currentSeries}
            comments={comments}
            isLiked={isLiked}
            isFollowing={isFollowing}
            onToggleLike={toggleLike}
            onToggleFollow={toggleFollow}
            onOpenChapter={handleOpenReader}
            onAddComment={publishComment}
            onBack={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'reader' && currentSeries && (
          <ReaderPage
            series={currentSeries}
            chapterNum={currentChapterNum}
            onSelectChapter={handleOpenReader}
            onBackToSeries={() => setCurrentView('series')}
            onPrevChapter={handlePrevChapter}
            onNextChapter={handleNextChapter}
          />
        )}
      </main>
      </div>

      {/* Barra Flotante Móvil de Navegación */}
      <nav className="floating-mobile-nav" aria-label="Navegación móvil">
        <button
          type="button"
          className={`floating-nav-btn ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => {
            setCurrentView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Inicio</span>
        </button>

        <button
          type="button"
          className={`floating-nav-btn ${currentView === 'series' ? 'active' : ''}`}
          onClick={() => {
            if (currentSeries) {
              setCurrentView('series');
            } else {
              handleOpenSeries(0);
            }
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span>Biblioteca</span>
        </button>

        <button
          type="button"
          className="floating-nav-btn"
          onClick={() => setIsSearchOpen(true)}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Explorar</span>
        </button>

        <button
          type="button"
          className="floating-nav-btn"
          onClick={() => setIsLoginOpen(true)}
        >
          <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Perfil</span>
        </button>
      </nav>

      {/* Modal de Búsqueda */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={searchSeries}
        onSelectSeries={handleOpenSeries}
      />

      {/* Modal de Autenticación (Login / Registro) */}
      <BookLogin
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

