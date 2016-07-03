function reducer(state = {targetM: [], topoM: []}, action) {
var tempState = {...state};
  switch (action.type) {
    case "createTopoM":
			tempState.topoM = action.M;
      break;
    case "updateTopoM":
			tempState.topoM = [...state.topoM];
			tempState.topoM[action.row] = [...state.topoM[action.row]];
			tempState.topoM[action.row][action.col] = action.value;
			tempState.topoM[action.col] = [...state.topoM[action.col]];
			tempState.topoM[action.col][action.row] = action.value;
			//console.log("updateTopoM triggered: ", action, tempState);
      break;
		default:
  }
  return tempState;
}

window.store = Redux.createStore(reducer);