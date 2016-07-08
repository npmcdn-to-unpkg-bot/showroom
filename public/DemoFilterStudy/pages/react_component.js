(function(w){

w.ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

w.MatrixTopology = React.createClass({
  render: function() {
		var _this = this,
			thStyle = {border: '1px solid black', textAlign: 'center'},
			tdStyle = {border: '1px solid black', textAlign: 'center'};
    return (
      <ReactCSSTransitionGroup transitionName="gb-transition" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
				<table style={{width: '100%', borderCollapse: 'collapse'}}>
					<tr>
						<th></th>
						{this.props.topoM.map( (row, index_row) => {
							if (index_row === 0){return <th style={thStyle}>S</th>}
							if (index_row === this.props.topoM.length - 1){return <th style={thStyle}>L</th>}
							return <th style={thStyle}>{index_row}</th>
						})}
					</tr>
					{this.props.topoM.map( (row, index_row) => {
						let firstCol;
						if (index_row === 0){
							firstCol = <td style={tdStyle}>S</td>
						} else if (index_row === this.props.topoM.length - 1){
							firstCol = <td style={tdStyle}>L</td>
						} else {
							firstCol = <td style={tdStyle}>{index_row}</td>
						}
						return (
							<tr>
							{firstCol}
							{
								row.map( (eleM, index_col) => {
									return (
										<td style={tdStyle} onClick={() => {
											if (Math.abs(index_col - index_row) > 1.5){
												this.props.clickM(index_row, index_col, 1 - eleM)
											}
										}}>
										{(eleM === 1)? <span className="glyphicon glyphicon-ok-sign" aria-hidden="true"></span> : <span aria-hidden="true"></span>}
										</td>
									)
								})
							}
							</tr>
						)
					})}
				</table>
      </ReactCSSTransitionGroup>
    );
  }
});

const mapStateToProps = (state) => {
  return {
    topoM: state.topoM
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
		clickM: (row, col, value) => { dispatch({type: "updateTopoM", row: row, col: col, value: value}) }
  }
}

w.MatrixTopologyContainer = ReactRedux.connect(
  mapStateToProps,
  mapDispatchToProps
)(MatrixTopology);

})(window);