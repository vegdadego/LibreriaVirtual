import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './features/series/presentation/pages/HomePage';
import SeriesDetailPage from './features/series/presentation/pages/SeriesDetailPage';
import ReaderPage from './features/series/presentation/pages/ReaderPage';
import SearchModal from './features/series/presentation/components/SearchModal';
import { useSeries } from './features/series/presentation/hooks/useSeries';

import './styles/olympus.css';

function MainApp() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'series' | 'reader'
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
    <div className="app-container">
      {/* Header Global */}
      <Header
        onGoHome={() => {
          setCurrentView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleSearch={() => setIsSearchOpen(true)}
      />

      {/* Contenido Principal */}
      <main className="main-content">
        {currentView === 'home' && (
          <HomePage
            seriesList={seriesList}
            featuredSeries={featuredSeries}
            onSelectSeries={handleOpenSeries}
            onReadNow={(id, chap) => {
              selectSeries(id).then(() => {
                handleOpenReader(chap);
              });
            }}
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

      {/* Footer */}
      <Footer />

      {/* Modal de Búsqueda */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={searchSeries}
        onSelectSeries={handleOpenSeries}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
