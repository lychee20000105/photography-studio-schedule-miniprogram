/**
 * Notes: 云屿摄影小记
 */

const BaseProjectModel = require('./base_project_model.js');

class WorkNoteModel extends BaseProjectModel {}

WorkNoteModel.CL = 'bx_work_note';

WorkNoteModel.DB_STRUCTURE = {
	_pid: 'string|true',
	NOTE_ID: 'string|true',
	NOTE_TYPE: 'string|true|default=personal|comment=personal/team',
	NOTE_TITLE: 'string|true',
	NOTE_CONTENT: 'string|false',
	NOTE_DATE: 'string|false',
	NOTE_CREATOR_OPENID: 'string|true',
	NOTE_CREATOR_STAFF_ID: 'string|false',
	NOTE_CREATOR_NAME: 'string|false',
	NOTE_STATUS: 'int|true|default=1',
	NOTE_ADD_TIME: 'int|true',
	NOTE_EDIT_TIME: 'int|true',
	NOTE_ADD_IP: 'string|false',
	NOTE_EDIT_IP: 'string|false',
};

WorkNoteModel.FIELD_PREFIX = 'NOTE_';

module.exports = WorkNoteModel;
