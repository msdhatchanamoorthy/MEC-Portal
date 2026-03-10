const Notice = require('../models/Notice');

const getNotices = async (req, res) => {
    try {
        const user = req.user;
        let filter = { isActive: true };

        // For staff, show global + department specific + staff targeted
        if (user.role === 'staff') {
            filter.$or = [
                { department: null, targetRoles: { $in: ['all', 'staff'] } },
                { department: user.department?._id || user.department, targetRoles: { $in: ['all', 'staff'] } }
            ];
        } else if (user.role === 'hod') {
            filter.$or = [
                { department: null, targetRoles: { $in: ['all', 'hod'] } },
                { department: user.department?._id || user.department }
            ];
        }

        const notices = await Notice.find(filter)
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ success: true, count: notices.length, data: notices });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching notices' });
    }
};

const createNotice = async (req, res) => {
    try {
        const { title, content, targetRoles } = req.body;

        let department = null;
        if (req.user.role === 'hod') {
            department = req.user.department?._id || req.user.department;
        }

        const notice = await Notice.create({
            title,
            content,
            author: req.user._id,
            authorName: req.user.name,
            authorRole: req.user.role,
            department,
            targetRoles: targetRoles || ['all']
        });

        res.status(201).json({ success: true, data: notice });
    } catch (error) {
        res.status(500).json({ message: 'Server error creating notice' });
    }
};

const deleteNotice = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);

        if (!notice) return res.status(404).json({ message: 'Notice not found' });

        if (req.user.role !== 'principal' && notice.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete' });
        }

        await notice.deleteOne();
        res.json({ success: true, message: 'Notice deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error deleting notice' });
    }
};

module.exports = {
    getNotices,
    createNotice,
    deleteNotice
};
