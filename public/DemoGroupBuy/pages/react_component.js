(function(w){

w.ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

w.GbAddressList = React.createClass({
  getInitialState: function() {
    return {addresses: [], modalAddress: {}};
  },
	componentDidMount: function() {
		(async function(){
			var addresses;
			try {
				addresses = await this.props.ajax('getAddressList', {});
			} catch(e){
				addresses = [];
			}
			this.setState({addresses: addresses});
		}.bind(this))();
	},
	handleAddAddress: function(e){
		
	},
	handleClick: function(modalAddress){
		this.setState({modalAddress: modalAddress});
		$('#edit-address').modal('show');
	},
	handleModalChange: function(key, value){
		var tempModalAddress = angular.copy(this.state.modalAddress);
		tempModalAddress[key] = value;
		this.setState({modalAddress: tempModalAddress});
	},
  render: function() {
		var _this = this;
    return (
      <ReactCSSTransitionGroup transitionName="gb-transition" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
        {this.state.addresses.map( address => <GbAddress key={address.id} address={address} click={this.handleClick}/> )}
				<GbAddressBtn click={this.handleClick}/>
				<GbAddressModal name="edit-address" address={this.state.modalAddress} change={this.handleModalChange}/>
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
										{this.props.address.streetno} {this.props.address.streetname},
									</div>
									<div>
										{this.props.address.city}, {this.props.address.province}
									</div>
									<div>
										{this.props.address.country} {this.props.address.postcode}
									</div>
							</div>
							<div onClick={ () => this.props.click(this.props.address) } className="gb-cursor-pointer">
									<div className="panel-footer">
											<span className="pull-left">Edit</span>
											<span className="pull-right"><i className="fa fa-edit"></i></span>
											<div className="clearfix"></div>
									</div>
							</div>
					</div>
			</div>
    );
  }
});

w.GbAddressBtn = React.createClass({
  render: function() {
    return (
			<div className="col-lg-3 col-md-6" key='-1'>
					<div className="panel panel-primary">
							<div onClick={ () => this.props.click() } className="gb-cursor-pointer">
									<div className="panel-footer text-center" style={{padding: '25px'}}>
										<i className="fa fa-plus-square-o fa-5x"></i>
									</div>
							</div>
					</div>
			</div>
    );
  }
});

w.GbAddressModal = React.createClass({
  render: function() {
		var currentAddr = {};
    return (
			<div className="modal fade" id={this.props.name} tabindex="-1" role="dialog">
				<div className="modal-dialog">
					<div className="modal-content">
						<div className="modal-header">
							<button type="button" className="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
							<h4 className="modal-title">Modal title</h4>
						</div>
						<div className="modal-body">
							<form>
								<div className="form-group">
									<label htmlFor="streetno" className="control-label">Recipient:</label>
									<input type="text" className="form-control" id="streetno" value={this.props.address.streetno} onChange={ e => {this.props.change('streetno', e.target.value)} }/>
								</div>
								<div className="form-group">
									<label htmlFor="streetname" className="control-label">Recipient:</label>
									<input type="text" className="form-control" id="streetname" value={this.props.address.streetname}/>
								</div>
								<div className="form-group">
									<label htmlFor="city" className="control-label">Recipient:</label>
									<input type="text" className="form-control" id="city" value={this.props.address.city}/>
								</div>
								<div className="form-group">
									<label htmlFor="province" className="control-label">Recipient:</label>
									<input type="text" className="form-control" id="province" value={this.props.address.province}/>
								</div>
								<div className="form-group">
									<label htmlFor="country" className="control-label">Recipient:</label>
									<input type="text" className="form-control" id="country" value={this.props.address.country}/>
								</div>
								<div className="form-group">
									<label htmlFor="postcode" className="control-label">Recipient:</label>
									<input type="text" className="form-control" id="streetname" value={this.props.address.postcode}/>
								</div>
							</form>
						</div>
						<div className="modal-footer">
							<button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
							<button type="button" className="btn btn-primary">Save changes</button>
						</div>
					</div>
				</div>
			</div>
    );
  }
});

})(window);