/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Zimlets
 * Copyright (C) 2009, 2010 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

//////////////////////////////////////////////////////////////////////////////
// Zimlet that checks for attach* word in email and also if there is an attachment.
// if the email doesnt have an attachment, throws missing-attachment alert dialog  
// @author Zimlet author: Raja Rao DV(rrao@zimbra.com)
//////////////////////////////////////////////////////////////////////////////

function com_zimbra_attachmentalert() {
}

com_zimbra_attachmentalert.prototype = new ZmZimletBase();
com_zimbra_attachmentalert.prototype.constructor = com_zimbra_attachmentalert;

com_zimbra_attachmentalert.prototype.init =
function() {
	this.turnONAttachmentAlertZimletNew = this.getUserProperty("turnONAttachmentAlertZimletNew") == "true";
};

com_zimbra_attachmentalert.prototype.initializeRegEx =
function() {
	if (this._attachWordsRegEx)
		return;

	this._attachWordsList = ["attach"];
	this._attachWordsRegEx = [];
	for (var n = 0; n < this._attachWordsList.length; n++) {
		this._attachWordsRegEx.push(new RegExp("\\b" + this._attachWordsList[n], "ig"));
	}
};

com_zimbra_attachmentalert.prototype.emailErrorCheck =
function(mail, boolAndErrorMsgArray) {
	if (!this.turnONAttachmentAlertZimletNew)
		return;

	//check if we have some attachments..
	if(mail._filteredFwdAttIds){
		if(mail._filteredFwdAttIds.length > 0)
			return null;//has attachments, dont bother
	}
	if(mail._forAttIds){
		if(mail._forAttIds.length > 0)
			return null;//has attachments, dont bother
	}

	this.initializeRegEx();
	this._ignoreWords = [];
	if (mail.isReplied || mail.isForwarded) {
		this._createIgnoreList(mail._origMsg);
	}
	var attachWordsThatExists = "";
	var newMailContent = mail.textBodyContent;

	//if we have word like attachment? ignore(it could be a question)
	if(/\battach.*\?/.test(newMailContent)) {
	 return;
	}
	var hasattachWordStr = false;
	for (var k = 0; k < this._attachWordsRegEx.length; k++) {
		var attachWord = this._attachWordsRegEx[k];
		var newMailArry = newMailContent.match(attachWord);
		if (!newMailArry)
			continue;

		var newMailLen = newMailArry.length;
		//if the number of attachWords in the new mail is same as origMail, skip it
		if (this._ignoreWords[attachWord] != undefined) {
			if (newMailLen <= this._ignoreWords[attachWord]) {
				hasattachWordStr = false;
				continue;
			}
		}
		hasattachWordStr = true;
		break;
		
	}

	if (!hasattachWordStr)
		return null;

	//there is a word "attach*" in new mail but not in old-mail
	return boolAndErrorMsgArray.push({hasError:true, errorMsg:"No Attachment(s) Found. You might have forgotten to attach it. Continue anyway?", zimletName:"com_zimbra_attachmentalert"});
};


com_zimbra_attachmentalert.prototype._createIgnoreList =
function(origMail) {
	var bodyContent = origMail.getBodyContent();
	for (var k = 0; k < this._attachWordsRegEx.length; k++) {
		var attachWord = this._attachWordsRegEx[k];
		var mailArry = bodyContent.match(attachWord);
		if (!mailArry)
			continue;

		this._ignoreWords[attachWord] = mailArry.length;
	}
};

com_zimbra_attachmentalert.prototype.doubleClicked = function() {
	this.singleClicked();
};

com_zimbra_attachmentalert.prototype.singleClicked = function() {
	this.showPrefDialog();
};

com_zimbra_attachmentalert.prototype.showPrefDialog =
function() {
	//if zimlet dialog already exists...
	if (this.pbDialog) {
		this.pbDialog.popup();
		return;
	}
	this.pView = new DwtComposite(this.getShell());
	this.pView.getHtmlElement().innerHTML = this.createPrefView();

	if (this.getUserProperty("turnONAttachmentAlertZimletNew") == "true") {
		document.getElementById("turnONAttachmentAlertZimletNew_chkbx").checked = true;
	}
	this.pbDialog = this._createDialog({title:"'Attachment Alert in compose' Zimlet Preferences", view:this.pView, standardButtons:[DwtDialog.OK_BUTTON]});
	this.pbDialog.setButtonListener(DwtDialog.OK_BUTTON, new AjxListener(this, this._okBtnListner));
	this.pbDialog.popup();
};

com_zimbra_attachmentalert.prototype.createPrefView =
function() {
    var html = new Array();
    var i = 0;
    html[i++] = "<DIV>";
    html[i++] = "<input id='turnONAttachmentAlertZimletNew_chkbx'  type='checkbox'/>Enable 'Attachment Alert' Zimlet (Changing this would refresh browser)";
    html[i++] = "</DIV>";
    return html.join("");
};


com_zimbra_attachmentalert.prototype._okBtnListner =
function() {
	this._reloadRequired = false;
	if (document.getElementById("turnONAttachmentAlertZimletNew_chkbx").checked) {
		if (!this.turnONAttachmentAlertZimletNew) {
			this._reloadRequired = true;
		}
		this.setUserProperty("turnONAttachmentAlertZimletNew", "true", true);
	} else {
		this.setUserProperty("turnONAttachmentAlertZimletNew", "false", true);
		if (this.turnONAttachmentAlertZimletNew)
			this._reloadRequired = true;
	}
	this.pbDialog.popdown();

	if (this._reloadRequired) {
		window.onbeforeunload = null;
		var url = AjxUtil.formatUrl({});
		ZmZimbraMail.sendRedirect(url);
	}
};