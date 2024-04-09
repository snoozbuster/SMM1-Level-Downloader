# Announcement
I am currently createing a whole UI System with Settings and Level Search using ElectronJS
If u got any feature requests Dm me on Discord: nintendo_switch

# SMM1-Level-Downloader
A Super Mario Maker 1 Level Downloader designed for the Use of the WayBackMachines Level Collection

![Screenshot 2024-04-08 153652](https://github.com/HerobrineTV/SMM1-Level-Downloader/assets/70803896/d31ae25c-182e-429e-a553-c74e6e5c4195)

# Features:
- Download every existing SMM1 Level from the Archive
- Download Multiple Levels at once
- Have a course Preview for saved Courses
- Have a WildCard Search for Levels (Takes sometimes a bit, but working)
- Use Proxies to download Levels even faster (needs to be enabled in Settings)
- Download Levels directly into CEMU (Comming Soon, will also be toggleable in Settings)
- Overwrite CEMU Levels directly on Download (Comming Soon, Will add a Backup Toggle in Settings)
- Delete Levels (Currently Downloads only please, else it could break stuff!!!)

# Decompilation
To Decompile the Levels I used ASH Extractor which is already In this Repository
http://wiibrew.org/wiki/ASH_Extractor

# First time setup
For the first time setup u need to install axios
"npm install axios"
Might be not needed anymore?? have to check that

# Usage
Just unzip the "SMM1Downloader.zip" from the releases Tab and start the "SMM1Downloader.exe"
All should work from then.

# How does this work?
I packed my ElectronJS Application into a .exe format by using electron-packager, just run unzip the .zip File from the Releases

It gathers the Archive.org download link for the Searched Level from my Database.

Then it is downloading it from Archive.org
(Information here: https://archive.org/details/super_mario_maker_courses_202105)

After that u can View it in Saved Levels in the Programm.
There u will be able to see the Curse display. Which was only possible through Leo's Course Viewer, which he allowed me to implement!
(https://github.com/leomaurodesenv/smm-course-viewer)
Big thanks to him!

Now u can Press the "Open Folder" Button and u will see all your Saved Levels.

Just copy the inside of the folders in your desired Mario Maker 1 Savefile in one of the course files.

# Where do the Testing Levels Come from?
The Testing Levels come from 2 Archives which tell theyre Official Testing Levels, but If thats true we will never know.
https://archive.org/details/smm1-game-dev
https://archive.org/details/smm1staging

# Can I add more Levels if I only got the File without Definition?
Yes you can, just put it in this Folder: "SMMDownloader\Data\OfficialCourses\CourseFiles"
And next time u press "Reset Official Courses", it will get loaded if it is a valid File (or if its a broken one it could crash xD)

# Important Note
U have to create the course Files ingame and not by creating a Folder, else they wont show up!
All Copyright of the Used Images goes to Nintendo
