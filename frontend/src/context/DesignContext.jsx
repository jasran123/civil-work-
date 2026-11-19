import { createContext, useCallback, useContext, useReducer, useRef } from 'react';
import { useAuth } from './AuthContext';
import API from '../utils/api';
import {
  downloadProject,
  GUEST_PROJECT_KEY,
  makeProjectDocument,
  projectReducer,
  startProjectHistory,
} from '../utils/projectState';

const DesignContext = createContext();
export const useDesign = () => useContext(DesignContext);

function initializeHistory(token) {
  if (!token) {
    try {
      const saved = localStorage.getItem(GUEST_PROJECT_KEY);
      if (saved) return startProjectHistory(JSON.parse(saved));
    } catch {
      // The planner remains available when storage cannot be read.
    }
  }
  return startProjectHistory();
}

export function DesignProvider({ children }) {
  const auth = useAuth();
  const userId = auth?.user?._id ?? auth?.user?.id;
  const accountToken = auth?.token;
  const [state, dispatch] = useReducer(projectReducer, auth?.token, initializeHistory);
  const { design } = state;
  const remoteProject = useRef({});
  const accountSaveQueue = useRef(Promise.resolve());

  const updateDesign = useCallback((updates, options) => dispatch({ type: 'patch', updates, history: options?.history }), []);
  const setFloorRooms = useCallback((index, rooms, options) => dispatch({ type: 'floorRooms', index, rooms, history: options?.history }), []);
  const setFloorDetails = useCallback((index, updates, options) => dispatch({ type: 'floorDetails', index, updates, history: options?.history }), []);
  const setActiveFloor = useCallback((index) => dispatch({ type: 'activeFloor', index }), []);
  const addFloor = useCallback(() => dispatch({ type: 'addFloor' }), []);
  const selectPlan = useCallback((index) => dispatch({ type: 'selectPlan', index }), []);
  const beginHistoryGroup = useCallback(() => dispatch({ type: 'beginGroup' }), []);
  const endHistoryGroup = useCallback(() => dispatch({ type: 'endGroup' }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  const openProject = useCallback((project) => {
    remoteProject.current = userId && project?._id ? { owner: userId, id: project._id } : {};
    dispatch({ type: 'open', project });
  }, [userId]);

  const resetDesign = useCallback(() => {
    remoteProject.current = {};
    dispatch({ type: 'open' });
  }, []);

  const saveProject = useCallback(async (costEstimate) => {
    const document = makeProjectDocument(design, costEstimate);
    const scope = remoteProject.current;
    const rememberEstimate = () => {
      if (costEstimate && remoteProject.current === scope) updateDesign({ costEstimate }, { history: false });
    };
    if (!userId) {
      localStorage.setItem(GUEST_PROJECT_KEY, JSON.stringify(document));
      rememberEstimate();
      return { scope: 'local', project: document };
    }

    const request = accountSaveQueue.current.catch(() => {}).then(async () => {
      if (localStorage.getItem('token') !== accountToken) throw new Error('Sign in to save this project to your account.');
      const id = scope.owner === userId ? scope.id : null;
      const { data } = id
        ? await API.put(`/designs/${encodeURIComponent(id)}`, document)
        : await API.post('/designs', document);
      scope.owner = userId;
      scope.id = data._id;
      rememberEstimate();
      return { scope: 'account', project: data };
    });
    accountSaveQueue.current = request;
    return request;
  }, [accountToken, design, updateDesign, userId]);

  const exportProject = useCallback(() => downloadProject(design), [design]);

  return (
    <DesignContext.Provider value={{
      design, updateDesign, resetDesign, openProject, saveProject, exportProject,
      setFloorRooms, setFloorDetails, setActiveFloor, addFloor, selectPlan,
      beginHistoryGroup, endHistoryGroup, undo, redo,
      canUndo: state.past.length > 0 || Boolean(state.group?.changed),
      canRedo: state.future.length > 0 && !state.group?.changed,
    }}>
      {children}
    </DesignContext.Provider>
  );
}
