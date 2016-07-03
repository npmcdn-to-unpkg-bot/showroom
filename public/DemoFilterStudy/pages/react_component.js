(function(w){

w.ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

w.MatrixTopology = React.createClass({
  render: function() {
		var tableStyle = {width: '100%', borderCollapse: 'collapse'};
		var _this = this;
    return (
      <ReactCSSTransitionGroup transitionName="gb-transition" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
				<table style={tableStyle}>
					<tr>
						<th></th>
						{this.props.topoM.map( (row, index_row) => {
							if (index_row === 0){return <th>S</th>}
							if (index_row === this.props.topoM.length - 1){return <th>L</th>}
							return <th>{index_row}</th>
						})}
					</tr>
					{this.props.topoM.map( (row, index_row) => {
						let firstCol;
						if (index_row === 0){
							firstCol = <td>S</td>
						} else if (index_row === this.props.topoM.length - 1){
							firstCol = <td>L</td>
						} else {
							firstCol = <td>{index_row}</td>
						}
						return (
							<tr>
							{firstCol}
							{
								row.map( (eleM, index_col) => {
									return (
										<td onClick={() => {
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