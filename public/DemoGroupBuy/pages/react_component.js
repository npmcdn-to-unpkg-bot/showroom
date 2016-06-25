(function(w){

w.ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

w.GbAddressList = React.createClass({
  getInitialState: function() {
    return {addresses: [], modalAddress: {}, modalShow: false};
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
	handleRefresh: function(addresses) {
		this.setState({addresses: addresses});
	},
  render: function() {
		var _this = this;
    return (
      <ReactCSSTransitionGroup transitionName="gb-transition" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
        {this.state.addresses.map( address => <GbAddress key={address.id} address={address}/> )}
				<GbAddressBtn/>
				<GbAddressModal name="edit-address" ajax={this.props.ajax} callback={this.handleRefresh}/>
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
							<div onClick={ () => store.dispatch({type: "profile.address.editAddress", oldAddr: this.props.address}) } className="gb-cursor-pointer">
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
							<div onClick={ () => store.dispatch({type: "profile.address.addNewAddress"}) } className="gb-cursor-pointer">
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
	unsubscribe: function() {},
	modalElement: undefined,
	handleSaveAddress: function(){
		(async function(){
			let addresses;
			try {
				addresses = await this.props.ajax('saveAddress', this.state.modalAddress);
			} catch(e){
				addresses = [];
			}
			store.dispatch({type: "profile.address.modalHide"});
			this.props.callback(addresses);
		}.bind(this))();
	},
	handleDeleteAddress: function(){
		(async function(){
			let addresses;
			try {
				addresses = await this.props.ajax('deleteAddress', this.state.modalAddress);
			} catch(e){
				addresses = [];
			}
			store.dispatch({type: "profile.address.modalHide"});
			this.props.callback(addresses);
		}.bind(this))();
	},
  getInitialState: function() {
		console.log("initial", {...this});
    return {modalAddress: {}, modalShow: false};
  },
	componentDidMount: function() {
		let _this = this;
		console.log("DidMount", {...this});
		this.modalElement = $('#' + this.props.name);
		this.modalElement.on('hidden.bs.modal', function (e) {
			store.dispatch({type: "profile.address.modalHide"});
		})
		this.unsubscribe = store.subscribe(() => {
			let tempState = store.getState().profile.address;
			console.log("subscribe", {...tempState});
			_this.setState({modalAddress: tempState.modalAddress, modalShow: tempState.modalShow});
		});
	},
	componentDidUpdate: function(prevProps, prevState) {
		if (this.state.modalShow && !prevState.modalShow) {
			this.modalElement.modal('show');
			console.log("modal show", {...this.state});
		} else if (!this.state.modalShow) {
			this.modalElement.modal('hide');
			console.log("modal hide", {...this.state});
		}
	},
	componentWillUnmount: function() {
		console.log("WillUnmount", {...this.state});
		this.unsubscribe();
		this.modalElement.off('hidden.bs.modal');
	},
  render: function() {
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
									<label htmlFor="streetno" className="control-label">Street number:</label>
									<input type="text" className="form-control" id="streetno" value={this.state.modalAddress.streetno} onChange={ e => {store.dispatch({type: "profile.address.changeAddressForm", key: "streetno", value: e.target.value})} }/>
								</div>
								<div className="form-group">
									<label htmlFor="streetname" className="control-label">Street name:</label>
									<input type="text" className="form-control" id="streetname" value={this.state.modalAddress.streetname} onChange={ e => {store.dispatch({type: "profile.address.changeAddressForm", key: "streetname", value: e.target.value})} }/>
								</div>
								<div className="form-group">
									<label htmlFor="city" className="control-label">City:</label>
									<input type="text" className="form-control" id="city" value={this.state.modalAddress.city} onChange={ e => {store.dispatch({type: "profile.address.changeAddressForm", key: "city", value: e.target.value})} }/>
								</div>
								<div className="form-group">
									<label htmlFor="province" className="control-label">Province:</label>
									<input type="text" className="form-control" id="province" value={this.state.modalAddress.province} onChange={ e => {store.dispatch({type: "profile.address.changeAddressForm", key: "province", value: e.target.value})} }/>
								</div>
								<div className="form-group">
									<label htmlFor="country" className="control-label">Country:</label>
									<input type="text" className="form-control" id="country" value={this.state.modalAddress.country} onChange={ e => {store.dispatch({type: "profile.address.changeAddressForm", key: "country", value: e.target.value})} }/>
								</div>
								<div className="form-group">
									<label htmlFor="postcode" className="control-label">Postcode:</label>
									<input type="text" className="form-control" id="streetname" value={this.state.modalAddress.postcode} onChange={ e => {store.dispatch({type: "profile.address.changeAddressForm", key: "postcode", value: e.target.value})} }/>
								</div>
							</form>
						</div>
						<div className="modal-footer">
							<button type="button" className="btn btn-warning" onClick={this.handleDeleteAddress}>Delete</button>
							<button type="button" className="btn btn-default" data-dismiss="modal">Cancel</button>
							<button type="button" className="btn btn-primary" onClick={this.handleSaveAddress}>Save</button>
						</div>
					</div>
				</div>
			</div>
    );
  }
});

})(window);