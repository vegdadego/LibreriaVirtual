import { useState, useEffect, useCallback, useMemo } from 'react';
import { defaultSeriesRepository } from '../../infrastructure/SeriesApiRepository';
import { GetSeriesListUseCase } from '../../application/GetSeriesListUseCase';
import { GetSeriesDetailUseCase } from '../../application/GetSeriesDetailUseCase';
import { GetFeaturedSeriesUseCase } from '../../application/GetFeaturedSeriesUseCase';
import { AddCommentUseCase } from '../../application/AddCommentUseCase';

export function useSeries(repository = defaultSeriesRepository) {
  const [seriesList, setSeriesList] = useState([]);
  const [featuredSeries, setFeaturedSeries] = useState(null);
  const [currentSeries, setCurrentSeries] = useState(null);
  const [currentChapterNum, setCurrentChapterNum] = useState(1);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Inyección de casos de uso
  const getListUseCase = useMemo(() => new GetSeriesListUseCase(repository), [repository]);
  const getDetailUseCase = useMemo(() => new GetSeriesDetailUseCase(repository), [repository]);
  const getFeaturedUseCase = useMemo(() => new GetFeaturedSeriesUseCase(repository), [repository]);
  const addCommentUseCase = useMemo(() => new AddCommentUseCase(repository), [repository]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [all, feat] = await Promise.all([
        getListUseCase.execute(),
        getFeaturedUseCase.execute()
      ]);
      setSeriesList(all);
      setFeaturedSeries(feat);
      if (all.length > 0) {
        setCurrentSeries(all[0]);
      }
    } catch (err) {
      console.error('Error al cargar series:', err);
    } finally {
      setLoading(false);
    }
  }, [getListUseCase, getFeaturedUseCase]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const selectSeries = async (id) => {
    setLoading(true);
    try {
      const detail = await getDetailUseCase.execute(id);
      setCurrentSeries(detail);
      const comms = await repository.getComments(id);
      setComments(comms || []);
      setIsLiked(false);
      setIsFollowing(false);
    } catch (err) {
      console.error('Error al seleccionar serie:', err);
    } finally {
      setLoading(false);
    }
  };

  const publishComment = async (text) => {
    if (!currentSeries) return;
    try {
      const newComment = await addCommentUseCase.execute(currentSeries.id, { text });
      setComments((prev) => [newComment, ...prev]);
      return newComment;
    } catch (err) {
      console.error('Error al publicar comentario:', err);
      throw err;
    }
  };

  const toggleLike = () => {
    setIsLiked((prev) => !prev);
  };

  const toggleFollow = () => {
    setIsFollowing((prev) => !prev);
  };

  const searchSeries = (query) => {
    if (!query || !query.trim()) return [];
    return seriesList.filter((s) => s.title.toLowerCase().includes(query.toLowerCase()));
  };

  return {
    seriesList,
    featuredSeries,
    currentSeries,
    currentChapterNum,
    setCurrentChapterNum,
    comments,
    loading,
    isLiked,
    isFollowing,
    selectSeries,
    publishComment,
    toggleLike,
    toggleFollow,
    searchSeries,
    reload: loadInitialData
  };
}
