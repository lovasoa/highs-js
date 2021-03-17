# CMAKE generated file: DO NOT EDIT!
# Generated by "Unix Makefiles" Generator, CMake Version 3.19

# Delete rule output on recipe failure.
.DELETE_ON_ERROR:


#=============================================================================
# Special targets provided by cmake.

# Disable implicit rules so canonical targets will work.
.SUFFIXES:


# Disable VCS-based implicit rules.
% : %,v


# Disable VCS-based implicit rules.
% : RCS/%


# Disable VCS-based implicit rules.
% : RCS/%,v


# Disable VCS-based implicit rules.
% : SCCS/s.%


# Disable VCS-based implicit rules.
% : s.%


.SUFFIXES: .hpux_make_needs_suffix_list


# Command-line flag to silence nested $(MAKE).
$(VERBOSE)MAKESILENT = -s

#Suppress display of executed commands.
$(VERBOSE).SILENT:

# A target that is always out of date.
cmake_force:

.PHONY : cmake_force

#=============================================================================
# Set environment variables for the build.

# The shell in which to execute make rules.
SHELL = /bin/sh

# The CMake executable.
CMAKE_COMMAND = /usr/local/bin/cmake

# The command to remove a file.
RM = /usr/local/bin/cmake -E rm -f

# Escaping for special characters.
EQUALS = =

# The top-level source directory on which CMake was run.
CMAKE_SOURCE_DIR = /home/runner/work/highs-js/highs-js/HiGHS

# The top-level build directory on which CMake was run.
CMAKE_BINARY_DIR = /home/runner/work/highs-js/highs-js/build

# Include any dependencies generated for this target.
include src/CMakeFiles/FortranHighs.dir/depend.make

# Include the progress variables for this target.
include src/CMakeFiles/FortranHighs.dir/progress.make

# Include the compile flags for this target's objects.
include src/CMakeFiles/FortranHighs.dir/flags.make

src/CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.o: src/CMakeFiles/FortranHighs.dir/flags.make
src/CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.o: /home/runner/work/highs-js/highs-js/HiGHS/src/interfaces/highs_lp_solver.f90
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --progress-dir=/home/runner/work/highs-js/highs-js/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_1) "Building Fortran object src/CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.o"
	cd /home/runner/work/highs-js/highs-js/build/src && /usr/bin/f95 $(Fortran_DEFINES) $(Fortran_INCLUDES) $(Fortran_FLAGS) -c /home/runner/work/highs-js/highs-js/HiGHS/src/interfaces/highs_lp_solver.f90 -o CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.o

src/CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.i: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Preprocessing Fortran source to CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.i"
	cd /home/runner/work/highs-js/highs-js/build/src && /usr/bin/f95 $(Fortran_DEFINES) $(Fortran_INCLUDES) $(Fortran_FLAGS) -E /home/runner/work/highs-js/highs-js/HiGHS/src/interfaces/highs_lp_solver.f90 > CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.i

src/CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.s: cmake_force
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green "Compiling Fortran source to assembly CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.s"
	cd /home/runner/work/highs-js/highs-js/build/src && /usr/bin/f95 $(Fortran_DEFINES) $(Fortran_INCLUDES) $(Fortran_FLAGS) -S /home/runner/work/highs-js/highs-js/HiGHS/src/interfaces/highs_lp_solver.f90 -o CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.s

# Object files for target FortranHighs
FortranHighs_OBJECTS = \
"CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.o"

# External object files for target FortranHighs
FortranHighs_EXTERNAL_OBJECTS =

lib/libFortranHighs.a: src/CMakeFiles/FortranHighs.dir/interfaces/highs_lp_solver.f90.o
lib/libFortranHighs.a: src/CMakeFiles/FortranHighs.dir/build.make
lib/libFortranHighs.a: src/CMakeFiles/FortranHighs.dir/link.txt
	@$(CMAKE_COMMAND) -E cmake_echo_color --switch=$(COLOR) --green --bold --progress-dir=/home/runner/work/highs-js/highs-js/build/CMakeFiles --progress-num=$(CMAKE_PROGRESS_2) "Linking CXX static library ../lib/libFortranHighs.a"
	cd /home/runner/work/highs-js/highs-js/build/src && $(CMAKE_COMMAND) -P CMakeFiles/FortranHighs.dir/cmake_clean_target.cmake
	cd /home/runner/work/highs-js/highs-js/build/src && $(CMAKE_COMMAND) -E cmake_link_script CMakeFiles/FortranHighs.dir/link.txt --verbose=$(VERBOSE)

# Rule to build all files generated by this target.
src/CMakeFiles/FortranHighs.dir/build: lib/libFortranHighs.a

.PHONY : src/CMakeFiles/FortranHighs.dir/build

src/CMakeFiles/FortranHighs.dir/clean:
	cd /home/runner/work/highs-js/highs-js/build/src && $(CMAKE_COMMAND) -P CMakeFiles/FortranHighs.dir/cmake_clean.cmake
.PHONY : src/CMakeFiles/FortranHighs.dir/clean

src/CMakeFiles/FortranHighs.dir/depend:
	cd /home/runner/work/highs-js/highs-js/build && $(CMAKE_COMMAND) -E cmake_depends "Unix Makefiles" /home/runner/work/highs-js/highs-js/HiGHS /home/runner/work/highs-js/highs-js/HiGHS/src /home/runner/work/highs-js/highs-js/build /home/runner/work/highs-js/highs-js/build/src /home/runner/work/highs-js/highs-js/build/src/CMakeFiles/FortranHighs.dir/DependInfo.cmake --color=$(COLOR)
.PHONY : src/CMakeFiles/FortranHighs.dir/depend

