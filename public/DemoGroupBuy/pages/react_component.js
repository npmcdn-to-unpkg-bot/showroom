(function(w){

w.ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

w.GbAddressList = React.createClass({
  getInitialState: function() {
    return {data: [1,2,3,4,5]};
  },
	handleAddAddress: function(e){
		this.setState({data: _.concat(this.state.data, 20)});
	},
  render: function() {
    var AddressNodes = this.state.data.map(function(address, index) {
      return (
        <GbAddress author={address} key={index}>
        </GbAddress>
      );
    });
    return (
      <ReactCSSTransitionGroup transitionName="gb-transition" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
        {AddressNodes}
				<div className="col-lg-3 col-md-6" key='-1'>
						<div className="panel panel-primary">
								<div onClick={this.handleAddAddress} className="gb-cursor-pointer">
										<div className="panel-footer text-center" style={{padding: '25px'}}>
											<i className="fa fa-plus-square-o fa-5x"></i>
										</div>
								</div>
						</div>
				</div>
      </ReactCSSTransitionGroup>
    );
  }
});

w.GbAddress = React.createClass({
  render: function() {
    return (
			<div className="col-lg-3 col-md-6">
					<div className="panel panel-primary">
							<div className="panel-heading">
									<div>
										100 King Street,
									</div>
									<div>
										Kitchener, Ontario
									</div>
									<div>
										Canada N3U 9I2
									</div>
							</div>
							<a href="#">
									<div className="panel-footer">
											<span className="pull-left">Edit</span>
											<span className="pull-right"><i className="fa fa-edit"></i></span>
											<div className="clearfix"></div>
									</div>
							</a>
					</div>
			</div>
    );
  }
});

})(window);